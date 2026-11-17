import http from 'http';
import dotenv from 'dotenv';
import { prisma } from './src/db.js';

dotenv.config();

const PORT = 5055; // Dedicated test port
process.env.PORT = PORT;

// Start server on test port
const { default: expressApp } = await import('./src/index.js');

// Helper to make HTTP requests with cookie jar
class TestClient {
  constructor() {
    this.cookie = null;
  }

  async request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const reqHeaders = {
        'Content-Type': 'application/json',
        ...headers,
      };

      if (this.cookie) {
        reqHeaders['Cookie'] = this.cookie;
      }
      if (payload) {
        reqHeaders['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: PORT,
          path,
          method,
          headers: reqHeaders,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            const setCookie = res.headers['set-cookie'];
            if (setCookie && setCookie.length > 0) {
              this.cookie = setCookie[0].split(';')[0];
            }
            let json = null;
            try {
              json = JSON.parse(data);
            } catch (e) {
              json = data;
            }
            resolve({ status: res.statusCode, headers: res.headers, body: json, raw: data });
          });
        }
      );

      req.on('error', reject);
      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  }
}

async function runTests() {
  console.log('==============================================');
  console.log('🧪 RUNNING COMPLETE ACCEPTANCE TEST SUITE');
  console.log('==============================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Password Hashing in DB Check
    console.log('[TEST 1] Verifying Password Hashing in SQLite DB...');
    const dbUsers = await prisma.user.findMany();
    assert(dbUsers.length === 10, `Found 10 seeded users in DB (got ${dbUsers.length})`);
    for (const u of dbUsers) {
      const isHashed = u.passwordHash.startsWith('$2a$') || u.passwordHash.startsWith('$2b$');
      assert(isHashed && !u.passwordHash.includes('Demo123!'), `User ${u.name} password is secure bcrypt hash`);
    }

    // 2. Login for all 10 accounts
    console.log('\n[TEST 2] Verifying Login for all 10 demo accounts...');
    const demoAccounts = [
      'admin@novaworks.example',
      'ayesha@novaworks.example',
      'bilal@novaworks.example',
      'hina@novaworks.example',
      'ali@novaworks.example',
      'hamza@novaworks.example',
      'sara@novaworks.example',
      'usman@novaworks.example',
      'zain@novaworks.example',
      'maryam@novaworks.example',
    ];

    for (const email of demoAccounts) {
      const client = new TestClient();
      const res = await client.request('POST', '/api/auth/login', {
        email,
        password: 'Demo123!',
      });
      assert(res.status === 200, `Login successful for ${email}`);
      assert(res.body.user && !res.body.user.passwordHash, `No password hash in response for ${email}`);
    }

    // 3. Wrong password generic error
    console.log('\n[TEST 3] Verifying generic error on invalid password / email...');
    const badClient = new TestClient();
    const badRes = await badClient.request('POST', '/api/auth/login', {
      email: 'admin@novaworks.example',
      password: 'WrongPassword999!',
    });
    assert(badRes.status === 401, 'Wrong password returns 401 status');
    assert(badRes.body.error === 'Invalid email or password', 'Generic error message for wrong password');

    const nonExistentRes = await badClient.request('POST', '/api/auth/login', {
      email: 'nobody@novaworks.example',
      password: 'Demo123!',
    });
    assert(nonExistentRes.status === 401, 'Non-existent user returns 401 status');
    assert(nonExistentRes.body.error === 'Invalid email or password', 'Generic error message for non-existent user');

    // 4. Logout invalidates session
    console.log('\n[TEST 4] Verifying Logout clears session and cookie...');
    const logoutClient = new TestClient();
    await logoutClient.request('POST', '/api/auth/login', {
      email: 'admin@novaworks.example',
      password: 'Demo123!',
    });
    const meBefore = await logoutClient.request('GET', '/api/auth/me');
    assert(meBefore.status === 200 && meBefore.body.user.role === 'ADMIN', 'Session active before logout');

    const logoutRes = await logoutClient.request('POST', '/api/auth/logout');
    assert(logoutRes.status === 200, 'Logout returned 200');

    const meAfter = await logoutClient.request('GET', '/api/auth/me');
    assert(meAfter.status === 401, 'Subsequent request to /api/auth/me returns 401 after logout');

    // 5. RBAC Enforcement: Agent cannot list projects or access transcript endpoints
    console.log('\n[TEST 5] Verifying RBAC: Agent restrictions (403)...');
    const agentClient = new TestClient();
    await agentClient.request('POST', '/api/auth/login', {
      email: 'ali@novaworks.example',
      password: 'Demo123!',
    });

    const agentProjectsRes = await agentClient.request('GET', '/api/projects');
    assert(agentProjectsRes.status === 403, 'Agent GET /api/projects returns 403');

    const agentAiRes = await agentClient.request('POST', '/api/ai/parse-transcript', {
      transcript: 'Meeting...',
    });
    assert(agentAiRes.status === 403, 'Agent POST /api/ai/parse-transcript returns 403');

    const agentCreateRes = await agentClient.request('POST', '/api/projects/create-from-transcript', {
      idempotencyKey: 'test',
    });
    assert(agentCreateRes.status === 403, 'Agent POST /api/projects/create-from-transcript returns 403');

    // 6. Tamper resistance: Forged role or userId in headers/body
    console.log('\n[TEST 6] Verifying Tamper Resistance (session user authority)...');
    const forgedRes = await agentClient.request(
      'GET',
      '/api/projects',
      { role: 'ADMIN', userId: 'ADMIN' },
      { 'x-user-role': 'ADMIN', 'x-user-id': 'ADMIN' }
    );
    assert(forgedRes.status === 403, 'Forged role/userId in body/headers ignored (still 403)');

    // 7. AI Transcript Parsing: Final corrections & rejected features
    console.log('\n[TEST 7] Verifying AI Transcript Parsing (Corrections & Exclusions)...');
    const adminClient = new TestClient();
    await adminClient.request('POST', '/api/auth/login', {
      email: 'admin@novaworks.example',
      password: 'Demo123!',
    });

    const sampleTranscript = `
Ayesha: First project is UrbanCart Website, for client UrbanCart Clothing. I'll manage it.
We initially discussed 18 October as the delivery date.
Ali: Do they need a real checkout, payment gateway, and stock integration?
Ayesha: No. Real payments and inventory integration are not included. Don't add a payment task or an inventory task.
Ali: Product catalog UI: 12 hours, due 12 October. Demo cart UI: 8 hours, due 15 October.
Hamza: Product and cart APIs: 14 hours, due 14 October.
Ali: Website integration and testing: initially 17 October. But please move that task to 19 October.
Ayesha: Accepted. Also client confirmed final delivery is 20 October, replacing 18 October.
`;

    const aiRes = await adminClient.request('POST', '/api/ai/parse-transcript', {
      transcript: sampleTranscript,
    });
    assert(aiRes.status === 200, 'Admin parse-transcript returned 200');
    const draft = aiRes.body.draft;
    assert(draft && draft.project, 'Draft contains project');
    assert(draft.project.deadline === '2026-10-20', `Final project deadline is 2026-10-20 (got ${draft.project.deadline})`);
    
    const integrationTask = draft.tasks.find((t) => t.title.includes('integration'));
    assert(integrationTask && integrationTask.deadline === '2026-10-19', `Revised task deadline honored (2026-10-19)`);

    const hasPaymentTask = draft.tasks.some((t) => t.title.toLowerCase().includes('payment'));
    const hasInventoryTask = draft.tasks.some((t) => t.title.toLowerCase().includes('inventory'));
    assert(!hasPaymentTask && !hasInventoryTask, 'Rejected features (payment/inventory) are excluded');

    // 8. Server-side validation of invalid drafts
    console.log('\n[TEST 8] Verifying Server-side validation rejection on invalid drafts...');
    // A: Non-MANAGER as manager
    const badManagerRes = await adminClient.request('POST', '/api/projects/create-from-transcript', {
      idempotencyKey: 'bad-mgr-1',
      project: {
        ...draft.project,
        managerId: 'DEV01', // DEV01 is an AGENT, not a MANAGER
        tasks: draft.tasks,
      },
    });
    assert(badManagerRes.status === 400, 'Rejects non-MANAGER managerId with 400');

    // B: Non-AGENT as assignee
    const badAssigneeTasks = draft.tasks.map((t, idx) => (idx === 0 ? { ...t, assigneeId: 'PM01' } : t));
    const badAssigneeRes = await adminClient.request('POST', '/api/projects/create-from-transcript', {
      idempotencyKey: 'bad-asg-1',
      project: {
        ...draft.project,
        tasks: badAssigneeTasks,
      },
    });
    assert(badAssigneeRes.status === 400, 'Rejects non-AGENT assigneeId with 400');

    // C: Task hours <= 0
    const badHoursTasks = draft.tasks.map((t, idx) => (idx === 0 ? { ...t, estimatedHours: 0 } : t));
    const badHoursRes = await adminClient.request('POST', '/api/projects/create-from-transcript', {
      idempotencyKey: 'bad-hrs-1',
      project: {
        ...draft.project,
        tasks: badHoursTasks,
      },
    });
    assert(badHoursRes.status === 400, 'Rejects task hours <= 0 with 400');

    // D: Task deadline after project deadline
    const badDateTasks = draft.tasks.map((t, idx) => (idx === 0 ? { ...t, deadline: '2026-10-25' } : t));
    const badDateRes = await adminClient.request('POST', '/api/projects/create-from-transcript', {
      idempotencyKey: 'bad-date-1',
      project: {
        ...draft.project,
        deadline: '2026-10-20',
        tasks: badDateTasks,
      },
    });
    assert(badDateRes.status === 400, 'Rejects task deadline exceeding project deadline with 400');

    // 9. Transaction Rollback on failure
    console.log('\n[TEST 9] Verifying Transaction Rollback (all-or-nothing)...');
    const countBeforeProjects = await prisma.project.count();
    const countBeforeTasks = await prisma.task.count();

    const rollbackRes = await adminClient.request('POST', '/api/projects/create-from-transcript', {
      idempotencyKey: 'rollback-test-key-1',
      testForceFailIndex: 2, // Force failure on 3rd task insert
      project: {
        ...draft.project,
        name: 'Rollback Project Test',
        tasks: draft.tasks,
      },
    });
    assert(rollbackRes.status === 500, 'Forced failure returned 500 status');

    const countAfterProjects = await prisma.project.count();
    const countAfterTasks = await prisma.task.count();
    assert(countAfterProjects === countBeforeProjects, 'Zero Project rows saved (rolled back)');
    assert(countAfterTasks === countBeforeTasks, 'Zero Task rows saved (rolled back)');

    // 10. Atomic Project Creation & Idempotency Key
    console.log('\n[TEST 10] Verifying Project Creation and Idempotency deduplication...');
    const idempotencyKey = 'unique-submission-uuid-12345';
    const createRes1 = await adminClient.request('POST', '/api/projects/create-from-transcript', {
      idempotencyKey,
      project: {
        ...draft.project,
        name: 'UrbanCart Website',
        tasks: draft.tasks,
      },
    });
    assert(createRes1.status === 201, 'First submission created project (201)');
    const createdProjectId = createRes1.body.project.id;

    // Resend identical idempotency key
    const createRes2 = await adminClient.request('POST', '/api/projects/create-from-transcript', {
      idempotencyKey,
      project: {
        ...draft.project,
        name: 'UrbanCart Website',
        tasks: draft.tasks,
      },
    });
    assert(createRes2.status === 200, 'Duplicate submission returns 200 with idempotent response');
    assert(createRes2.body.project.id === createdProjectId, 'Returns the exact same project ID');

    const projectDuplicates = await prisma.project.count({
      where: { submissionKey: idempotencyKey },
    });
    assert(projectDuplicates === 1, `Exactly one project in database for idempotency key (got ${projectDuplicates})`);

    // 11. Manager Scoped View & 403 on other manager's project
    console.log('\n[TEST 11] Verifying Manager View Scoping and 403/404 on other projects...');
    // Login as Ayesha (manager of UrbanCart)
    const ayeshaClient = new TestClient();
    await ayeshaClient.request('POST', '/api/auth/login', {
      email: 'ayesha@novaworks.example',
      password: 'Demo123!',
    });
    const ayeshaProjectsRes = await ayeshaClient.request('GET', '/api/projects');
    assert(ayeshaProjectsRes.status === 200, 'Ayesha can list projects');
    assert(
      ayeshaProjectsRes.body.projects.every((p) => p.managerId === 'PM01'),
      'Ayesha only sees projects where managerId == PM01'
    );

    const ayeshaProjectDetail = await ayeshaClient.request('GET', `/api/projects/${createdProjectId}`);
    assert(ayeshaProjectDetail.status === 200, 'Ayesha can access her own project detail');

    // Login as Bilal (different manager)
    const bilalClient = new TestClient();
    await bilalClient.request('POST', '/api/auth/login', {
      email: 'bilal@novaworks.example',
      password: 'Demo123!',
    });
    const bilalForbiddenRes = await bilalClient.request('GET', `/api/projects/${createdProjectId}`);
    assert(bilalForbiddenRes.status === 403, 'Bilal gets 403 on another manager project');

    // 12. Agent My Tasks View
    console.log('\n[TEST 12] Verifying Agent My Tasks view...');
    // Login as Ali (assignee of tasks on UrbanCart)
    const aliClient = new TestClient();
    await aliClient.request('POST', '/api/auth/login', {
      email: 'ali@novaworks.example',
      password: 'Demo123!',
    });
    const aliTasksRes = await aliClient.request('GET', '/api/tasks/my');
    assert(aliTasksRes.status === 200, 'Ali can call GET /api/tasks/my');
    assert(
      aliTasksRes.body.tasks.length > 0 && aliTasksRes.body.tasks.every((t) => t.assigneeId === 'DEV01'),
      'All returned tasks belong to Ali'
    );
    assert(aliTasksRes.body.tasks[0].project.name === 'UrbanCart Website', 'Tasks include limited project info');

    console.log('\n==============================================');
    console.log(`🏁 TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('==============================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
