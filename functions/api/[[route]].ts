// functions/api/[[route]].ts
// Cloudflare Pages Functions - Connects to Cloudflare D1 Database in Real-Time

interface D1Database {
  prepare: (query: string) => {
    bind: (...values: any[]) => {
      run: () => Promise<any>;
      all: () => Promise<{ results: any[] }>;
    };
    run: () => Promise<any>;
    all: () => Promise<{ results: any[] }>;
  };
}

interface Env {
  DB?: D1Database;
}

type PagesFunction<T = any> = (context: {
  request: Request;
  env: T;
  next?: () => Promise<Response>;
  data?: any;
}) => Promise<Response>;

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, '');
  const method = request.method;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Ensure required tables exist in D1 automatically without requiring manual SQL
  const ensureAppStateTable = async () => {
    if (!env.DB) return;
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS app_state (
          key TEXT PRIMARY KEY,
          json_data TEXT NOT NULL,
          version INTEGER NOT NULL,
          updated_at TEXT NOT NULL
        )
      `).run();
    } catch {
      // Table may already exist
    }

    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS websites (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          url TEXT NOT NULL,
          imageUrl TEXT,
          driveFileId TEXT,
          "order" INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        )
      `).run();
    } catch {
      // Table may already exist
    }

    try {
      await env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_websites_order ON websites("order")
      `).run();
    } catch {
      // Index may already exist
    }
  };

  try {
    // Health / Status check
    if (path === 'health' || path === '') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          platform: 'Cloudflare Pages & D1 Real-time Hub',
          d1Connected: !!env.DB,
          timestamp: new Date().toISOString(),
        }),
        { headers: corsHeaders }
      );
    }

    // Version endpoint for real-time polling check
    if (path === 'sync/version') {
      let currentVersion = 1;
      if (env.DB) {
        await ensureAppStateTable();
        try {
          const row: any = await env.DB.prepare(
            `SELECT version FROM app_state WHERE key = 'meta_version'`
          ).all();
          if (row?.results?.[0]?.version) {
            currentVersion = row.results[0].version;
          }
        } catch {
          // ignore
        }
      }
      return new Response(
        JSON.stringify({
          version: currentVersion,
          timestamp: Date.now(),
        }),
        { headers: corsHeaders }
      );
    }

    // Fetch all collections in a single call for high-speed sync
    if (method === 'GET' && (path === 'data/all' || path === 'sync/all')) {
      if (!env.DB) {
        return new Response(
          JSON.stringify({
            version: 1,
            data: {},
            message: 'D1 binding DB not active yet. Using client-side storage.',
          }),
          { headers: corsHeaders }
        );
      }

      await ensureAppStateTable();

      const dataStore: Record<string, any[]> = {
        users: [],
        assignments: [],
        submissions: [],
        documents: [],
        announcements: [],
        websites: [],
        lunch_menus: [],
        audit_logs: [],
      };
      let schoolProfile: any = null;
      let currentVersion = 1;

      let hasAnyData = false;
      try {
        const { results } = await env.DB.prepare(`SELECT * FROM app_state`).all();
        if (results && results.length > 0) {
          hasAnyData = true;
          for (const row of results as any[]) {
            if (row.key === 'meta_version') {
              currentVersion = row.version || currentVersion;
            } else if (row.key === 'school') {
              try {
                schoolProfile = JSON.parse(row.json_data);
              } catch {
                schoolProfile = null;
              }
            } else if (dataStore[row.key] !== undefined) {
              try {
                dataStore[row.key] = JSON.parse(row.json_data) || [];
              } catch {
                dataStore[row.key] = [];
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('Failed reading from app_state:', err);
      }

      // Check if relational announcements table exists in D1 and reconcile
      try {
        const annResults = await env.DB.prepare(`SELECT * FROM announcements`).all();
        if (annResults?.results && annResults.results.length > 0) {
          hasAnyData = true;
          dataStore.announcements = annResults.results.map((r: any) => ({
            id: r.id,
            title: r.title,
            content: r.content,
            type: r.type || 'general',
            category: r.category,
            date: r.date,
            dateStart: r.dateStart || r.date,
            dateEnd: r.dateEnd || r.date,
            assignmentId: r.assignmentId || r.assignment_id,
            authorName: r.authorName || r.author || 'ฝ่ายวิชาการ',
            isUrgent: r.type === 'deadline' || r.isUrgent === 1,
            createdAt: r.createdAt || r.created_at,
          }));
        }
      } catch {
        // Relational table might not exist; dataStore.announcements from app_state is preserved
      }

      // Check if relational websites table exists in D1 and reconcile
      try {
        const webResults = await env.DB.prepare(`SELECT * FROM websites ORDER BY "order" ASC`).all();
        if (webResults?.results && webResults.results.length > 0) {
          hasAnyData = true;
          dataStore.websites = webResults.results.map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description || '',
            url: r.url,
            imageUrl: r.imageUrl || '',
            driveFileId: r.driveFileId || '',
            order: Number(r.order ?? 0),
            createdAt: r.createdAt || new Date().toISOString(),
            updatedAt: r.updatedAt || new Date().toISOString(),
          }));
        }
      } catch {
        // Relational table might not exist; dataStore.websites from app_state is preserved
      }

      // If D1 is completely fresh/empty (e.g. fresh deployment), return isFreshDb flag
      // so the client application will automatically seed all website state into D1
      if (!hasAnyData) {
        return new Response(
          JSON.stringify({
            status: 'empty_fresh_db',
            isFreshDb: true,
            version: 1,
            data: null,
            school: null,
            message: 'Fresh Cloudflare D1 database. Automatic migration ready.',
          }),
          { headers: corsHeaders }
        );
      }

      // Purge any deleted SAR announcement from returning payload
      if (Array.isArray(dataStore.announcements)) {
        dataStore.announcements = dataStore.announcements.filter(
          (a) => a.id !== 'ann_03' && !a.title?.includes('SAR ประจำปี')
        );
      }

      return new Response(
        JSON.stringify({
          version: currentVersion,
          data: dataStore,
          school: schoolProfile,
          timestamp: Date.now(),
        }),
        { headers: corsHeaders }
      );
    }

    // Sync / Mutate endpoint
    if (method === 'POST' && (path === 'sync' || path === 'sync/broadcast')) {
      const body = (await request.json()) as any;
      const { table, action, data, school, fullState } = body;
      const newVersion = Date.now();
      const nowIso = new Date().toISOString();

      if (!env.DB) {
        return new Response(
          JSON.stringify({
            success: true,
            version: newVersion,
            message: 'Synced locally',
          }),
          { headers: corsHeaders }
        );
      }

      await ensureAppStateTable();

      if (fullState) {
        // Full state migration / push
        for (const [tblName, items] of Object.entries(fullState)) {
          if (tblName === 'school') {
            await env.DB.prepare(`
              INSERT OR REPLACE INTO app_state (key, json_data, version, updated_at)
              VALUES ('school', ?, ?, ?)
            `).bind(JSON.stringify(items), newVersion, nowIso).run();
          } else if (Array.isArray(items)) {
            await env.DB.prepare(`
              INSERT OR REPLACE INTO app_state (key, json_data, version, updated_at)
              VALUES (?, ?, ?, ?)
            `).bind(tblName, JSON.stringify(items), newVersion, nowIso).run();
          }
        }

        // Also populate websites relational table directly if fullState.websites exists
        if (Array.isArray(fullState.websites)) {
          try {
            await env.DB.prepare(`DELETE FROM websites`).run();
            for (const w of fullState.websites) {
              await env.DB.prepare(`
                INSERT OR REPLACE INTO websites (id, title, description, url, imageUrl, driveFileId, "order", createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                w.id,
                w.title || '',
                w.description || '',
                w.url || '',
                w.imageUrl || '',
                w.driveFileId || '',
                Number(w.order || 0),
                w.createdAt || nowIso,
                w.updatedAt || nowIso
              ).run();
            }
          } catch {}
        }
      } else if (table) {
        // Incremental mutation
        if (table === 'school') {
          await env.DB.prepare(`
            INSERT OR REPLACE INTO app_state (key, json_data, version, updated_at)
            VALUES ('school', ?, ?, ?)
          `).bind(JSON.stringify(data || school), newVersion, nowIso).run();
        } else {
          // Read current list
          let currentList: any[] = [];
          try {
            const row: any = await env.DB.prepare(`SELECT json_data FROM app_state WHERE key = ?`).bind(table).all();
            if (row?.results?.[0]?.json_data) {
              currentList = JSON.parse(row.results[0].json_data) || [];
            }
          } catch {
            currentList = [];
          }

          if (action === 'setList' && Array.isArray(data)) {
            currentList = table === 'announcements' 
              ? data.filter((item: any) => item.id !== 'ann_03' && !item.title?.includes('SAR ประจำปี'))
              : data;
          } else if (action === 'insert') {
            const idx = currentList.findIndex((item) => item.id === data.id);
            if (idx >= 0) {
              currentList[idx] = data;
            } else {
              currentList.unshift(data);
            }
          } else if (action === 'update') {
            const idx = currentList.findIndex((item) => item.id === data.id);
            if (idx >= 0) {
              currentList[idx] = { ...currentList[idx], ...data };
            } else {
              currentList.unshift(data);
            }
          } else if (action === 'delete') {
            currentList = currentList.filter(
              (item) => item.id !== data.id && (!data.title || item.title !== data.title)
            );
            if (table === 'announcements') {
              currentList = currentList.filter((item) => item.id !== 'ann_03' && !item.title?.includes('SAR ประจำปี'));
            }
            // Also attempt direct SQL delete on table if individual relational table exists in D1
            try {
              if (table && data && data.id) {
                await env.DB.prepare(`DELETE FROM ${table} WHERE id = ? OR (title IS NOT NULL AND title = ?)`).bind(data.id, data.title || data.id).run();
                if (table === 'announcements') {
                  await env.DB.prepare(`DELETE FROM announcements WHERE title LIKE '%SAR ประจำปี%' OR id = 'ann_03'`).run();
                }
                if (table === 'assignments') {
                  // Cascade delete submissions related to this assignment
                  await env.DB.prepare(`DELETE FROM submissions WHERE assignmentId = ?`).bind(data.id).run();
                  await env.DB.prepare(`DELETE FROM announcements WHERE assignment_id = ? OR assignmentId = ?`).bind(data.id, data.id).run();
                }
              }
            } catch {
              // Ignore if individual relational table does not exist
            }
          }

          // Direct sync to relational websites table if it exists in D1
          if (table === 'websites') {
            try {
              if (action === 'insert' || action === 'update') {
                if (data && data.id) {
                  await env.DB.prepare(`
                    INSERT OR REPLACE INTO websites (id, title, description, url, imageUrl, driveFileId, "order", createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `).bind(
                    data.id,
                    data.title || '',
                    data.description || '',
                    data.url || '',
                    data.imageUrl || '',
                    data.driveFileId || '',
                    Number(data.order || 0),
                    data.createdAt || nowIso,
                    data.updatedAt || nowIso
                  ).run();
                }
              } else if (action === 'setList' && Array.isArray(data)) {
                const keepIds = data.map((w: any) => w.id).filter(Boolean);
                if (keepIds.length > 0) {
                  const placeholders = keepIds.map(() => '?').join(',');
                  await env.DB.prepare(`DELETE FROM websites WHERE id NOT IN (${placeholders})`).bind(...keepIds).run();
                } else {
                  await env.DB.prepare(`DELETE FROM websites`).run();
                }
                for (const w of data) {
                  await env.DB.prepare(`
                    INSERT OR REPLACE INTO websites (id, title, description, url, imageUrl, driveFileId, "order", createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `).bind(
                    w.id,
                    w.title || '',
                    w.description || '',
                    w.url || '',
                    w.imageUrl || '',
                    w.driveFileId || '',
                    Number(w.order || 0),
                    w.createdAt || nowIso,
                    w.updatedAt || nowIso
                  ).run();
                }
              }
            } catch {
              // Fallback without driveFileId if older column structure
              try {
                if ((action === 'insert' || action === 'update') && data && data.id) {
                  await env.DB.prepare(`
                    INSERT OR REPLACE INTO websites (id, title, description, url, imageUrl, "order", createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  `).bind(
                    data.id,
                    data.title || '',
                    data.description || '',
                    data.url || '',
                    data.imageUrl || '',
                    Number(data.order || 0),
                    data.createdAt || nowIso,
                    data.updatedAt || nowIso
                  ).run();
                }
              } catch {}
            }
          }

          // Save updated list back
          await env.DB.prepare(`
            INSERT OR REPLACE INTO app_state (key, json_data, version, updated_at)
            VALUES (?, ?, ?, ?)
          `).bind(table, JSON.stringify(currentList), newVersion, nowIso).run();
        }
      }

      // Update meta_version
      await env.DB.prepare(`
        INSERT OR REPLACE INTO app_state (key, json_data, version, updated_at)
        VALUES ('meta_version', '1', ?, ?)
      `).bind(newVersion, nowIso).run();

      return new Response(
        JSON.stringify({
          success: true,
          version: newVersion,
          message: 'Saved & synced with Cloudflare D1',
        }),
        { headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: corsHeaders,
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
