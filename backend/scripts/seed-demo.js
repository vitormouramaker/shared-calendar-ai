/**
 * Contas e dados fictícios para rodar o Calendo localmente.
 *
 *   npm run seed:demo                      senha padrão Demo@123
 *   DEMO_PASSWORD="OutraSenha1" npm run seed:demo
 *
 * Pode rodar de novo: as contas de demonstração são apagadas (em cascata, com
 * eventos, convites e logs) e recriadas do zero. Outras contas não são tocadas.
 *
 * Trava de segurança: não roda com NODE_ENV=production.
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { postgres } = require("../src/server/connect");
const { ensureSchema } = require("../src/server/ensure-schema");

const DOMAIN = "demo.calendo.test";
const ACCOUNTS = [
  { key: "ana", name: "Ana Demo", username: "ana", isPrivate: true },
  { key: "bruno", name: "Bruno Demo", username: "bruno", isPrivate: true },
  { key: "carla", name: "Carla Demo", username: "carla", isPrivate: false },
];

const CATEGORIES = [
  { name: "Trabalho", color: "#7C3AED" },
  { name: "Pessoal", color: "#10B981" },
  { name: "Saúde", color: "#3B82F6" },
];

// Eventos relativos a "hoje" (fuso da sessão do banco). [dia, hora início, duração em min]
const EVENTS = {
  ana: [
    { title: "Planejamento da semana", category: "Trabalho", day: 0, hour: "09:00", minutes: 60, remind: true },
    { title: "Academia", category: "Saúde", day: 0, hour: "18:30", minutes: 60, remind: true },
    { title: "Leitura do relatório mensal", category: "Trabalho", day: 0, hour: "21:00", minutes: 60, remind: false },
    // Conflito proposital amanhã, para os insights do assistente terem o que mostrar.
    { title: "Reunião com o time de produto", category: "Trabalho", day: 1, hour: "10:00", minutes: 90, remind: true },
    { title: "Revisão de proposta", category: "Trabalho", day: 1, hour: "10:30", minutes: 60, remind: false },
    { title: "Entrevista de candidato", category: "Trabalho", day: 1, hour: "14:00", minutes: 45, remind: true },
    { title: "Almoço com a família", category: "Pessoal", day: 2, hour: "12:00", minutes: 90, remind: false },
    { title: "Consulta de rotina", category: "Saúde", day: 3, hour: "08:00", minutes: 60, remind: true },
    { title: "Retrospectiva da sprint", category: "Trabalho", day: 4, hour: "16:00", minutes: 60, remind: true },
  ],
  bruno: [
    { title: "Daily do time", category: "Trabalho", day: 0, hour: "09:30", minutes: 15, remind: true },
    { title: "Corrida no parque", category: "Saúde", day: 1, hour: "07:00", minutes: 45, remind: false },
  ],
  carla: [
    { title: "Aula aberta de fotografia", category: "Pessoal", day: 1, hour: "19:00", minutes: 120, remind: false },
    { title: "Mentoria em grupo", category: "Trabalho", day: 3, hour: "15:00", minutes: 60, remind: false },
  ],
};

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Este script cria contas com senha conhecida e não roda em produção.");
  }

  const password = String(process.env.DEMO_PASSWORD || "").trim() || "Demo@123";
  const passwordHash = await bcrypt.hash(password, 10);
  await ensureSchema();

  const emails = ACCOUNTS.map((account) => `${account.key}@${DOMAIN}`);
  await postgres.query("DELETE FROM users WHERE email = ANY($1::text[])", [emails]);

  const ids = {};
  for (const account of ACCOUNTS) {
    const { rows } = await postgres.query(
      `INSERT INTO users (name, username, email, password_hash, is_private)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (username) DO UPDATE SET
         name = EXCLUDED.name, email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash, is_private = EXCLUDED.is_private
       RETURNING id`,
      [account.name, account.username, `${account.key}@${DOMAIN}`, passwordHash, account.isPrivate],
    );
    ids[account.key] = rows[0].id;

    for (const category of CATEGORIES) {
      await postgres.query(
        `INSERT INTO user_categories (user_id, name, color) VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [ids[account.key], category.name, category.color],
      );
    }

    for (const event of EVENTS[account.key] ?? []) {
      const color = CATEGORIES.find((category) => category.name === event.category)?.color ?? "#7C3AED";
      const { rows: eventRows } = await postgres.query(
        `INSERT INTO events (user_id, title, description, category, category_color,
                             start_time, end_time, remind_me, remind_before_minutes)
         VALUES ($1, $2, $3, $4, $5,
                 (CURRENT_DATE + $6::int + $7::time)::timestamptz,
                 (CURRENT_DATE + $6::int + $7::time + make_interval(mins => $8::int))::timestamptz,
                 $9, 15)
         RETURNING id, title, start_time, end_time, category`,
        [ids[account.key], event.title, "Evento fictício de demonstração.", event.category, color,
          event.day, event.hour, event.minutes, event.remind],
      );
      const created = eventRows[0];
      await postgres.query(
        `INSERT INTO agenda_logs (owner_id, actor_user_id, actor_name, actor_username,
                                  action_type, target_type, target_id, target_title, metadata)
         VALUES ($1, $1, $2, $3, 'event_created', 'event', $4, $5, $6::jsonb)`,
        [ids[account.key], account.name, account.username, created.id, created.title,
          JSON.stringify({ start_time: created.start_time, end_time: created.end_time, category: created.category })],
      );
    }
  }

  // Ana compartilha a agenda com o Bruno (pode editar).
  await postgres.query(
    `INSERT INTO access_grants (owner_id, guest_id, permission_level, is_permanent)
     VALUES ($1, $2, 'edit', true)`,
    [ids.ana, ids.bruno],
  );
  // Bruno convidou a Ana para ver a agenda dele (convite pendente, vence em 7 dias).
  await postgres.query(
    `INSERT INTO access_invites (owner_id, guest_id, permission_level, is_permanent, expires_at)
     VALUES ($1, $2, 'view', false, NOW() + INTERVAL '7 days')`,
    [ids.bruno, ids.ana],
  );
  await postgres.query(
    `INSERT INTO notifications (user_id, title, body, type, route)
     VALUES ($1, 'Novo convite de agenda', 'Bruno Demo compartilhou a agenda com você.', 'invite_received', '/profile/received')`,
    [ids.ana],
  );

  for (const email of emails) {
    console.log(`conta pronta: ${email}`);
  }
  console.log(`senha das contas: ${password}`);
}

main()
  .catch((error) => {
    console.error("Erro ao criar os dados de demonstração:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(() => postgres.end());
