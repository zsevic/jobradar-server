require('dotenv').config();
const { Client } = require('pg');
const { Queue } = require('bullmq');

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const userResult = await db.query(
    `select
       u.id as "userId",
       u.email,
       u."licenseKey",
       fp.id as "presetId"
     from users u
     join filter_presets fp on fp."userId" = u.id
     where fp."alertsEnabled" = true
       and coalesce(u."licenseKey", '') <> ''
     order by u."createdAt" desc
     limit 1`,
  );

  if (!userResult.rows[0]) {
    console.log('No eligible user with alertsEnabled=true and licenseKey set.');
    await db.end();
    return;
  }

  const user = userResult.rows[0];
  const jobResult = await db.query(
    `select j.id
     from jobs j
     where not exists (
       select 1
       from notifications_sent ns
       where ns."userId" = $1 and ns."jobId" = j.id
     )
     order by j."postedAt" desc
     limit 2`,
    [user.userId],
  );

  if (jobResult.rows.length === 0) {
    console.log(`No unsent jobs found for user ${user.userId}.`);
    await db.end();
    return;
  }

  for (const row of jobResult.rows) {
    await db.query(
      `insert into pending_match_emails ("userId", "jobId", score, "presetId")
       values ($1, $2, $3, $4)
       on conflict ("userId", "jobId") do nothing`,
      [user.userId, row.id, 95, user.presetId],
    );
  }

  const redisUrl = new URL(process.env.REDIS_URL);
  const queue = new Queue('email-digest', {
    connection: {
      host: redisUrl.hostname,
      port: Number(redisUrl.port || 6379),
      username: redisUrl.username || undefined,
      password: redisUrl.password || undefined,
      db: redisUrl.pathname ? Number(redisUrl.pathname.slice(1)) || 0 : 0,
    },
  });

  const queued = await queue.add(
    'run-digest-manual',
    {},
    { removeOnComplete: true, removeOnFail: 50 },
  );
  await queue.close();
  await db.end();

  console.log(
    JSON.stringify(
      {
        userId: user.userId,
        email: user.email,
        insertedJobs: jobResult.rows.map((x) => x.id),
        queuedDigestJobId: queued.id,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
