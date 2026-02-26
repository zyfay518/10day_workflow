import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Config for seeding ---
// ⚠️ IMPORTANT: Because you already registered, I don't know your password.
// Please change 'YOUR_ACTUAL_PASSWORD' to the password you used when you registered zyfay0518@163.com!
const TEST_EMAIL = 'zyfay0518@163.com';
const TEST_PASSWORD = 'YOUR_ACTUAL_PASSWORD';
const START_DATE = new Date('2026-01-01T08:00:00Z');
const END_DATE = new Date(); // Use the end of today
const CYCLE_LENGTH_DAYS = 10;
const BLANK_CYCLE = 3;

// Example Data Pools
const HEALTH_NOTES = ["Morning jog", "Gym session", "Yoga", "Ate clean today", "Slept 8 hours", "Rest day"];
const WORK_NOTES = ["Deep work session", "Meeting marathon", "Finished the big feature", "Code review", "Planning", "Cleared inbox"];
const STUDY_NOTES = ["Read 30 pages", "React course", "Practiced Spanish", "Watched a documentary", "Listened to podcast", "Studied system design"];
const WEALTH_NOTES = ["Bought groceries", "Paid bills", "Invested in index funds", "Coffee with client", "No spend day", "Salary day!"];
const FAMILY_NOTES = ["Called mom", "Dinner with partner", "Played with kids", "Helped a friend", "Family gathering"];
const LEISURE_NOTES = ["Watched a movie", "Played video games", "Read a novel", "Went for a walk", "Listened to music", "Did nothing"];

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomExpense = () => (Math.random() > 0.6 ? Math.floor(Math.random() * 200) + 10 : 0);

async function seed() {
    console.log("🌱 Starting database seeding...");

    console.log(`1. Authenticating test user: ${TEST_EMAIL}`);
    let { data: { user }, error: authError } = await supabase.auth.signUp({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
    });

    if (authError) {
        if (authError.message.includes("User already registered")) {
            console.log("User already exists, signing in...");
            const signinRes = await supabase.auth.signInWithPassword({
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
            });
            if (signinRes.error) throw signinRes.error;
            user = signinRes.data.user;
        } else {
            console.error("Supabase Auth Error! If this is an email rate limit (429), please go to your Supabase Dashboard -> Authentication, delete the old users, and try running this script again.");
            throw new Error(`Auth Error: ${authError.message}`);
        }
    }

    const userId = user.id;
    console.log(`✅ Test User ID: ${userId}`);

    let { data: dimensions, error: dimError } = await supabase
        .from('dimensions')
        .select('*')
        .eq('user_id', userId);

    if (dimError) throw dimError;

    if (!dimensions || dimensions.length === 0) {
        console.warn("⚠️ No dimensions found! Generating default dimensions as fallback...");
        const defaultDims = [
            { user_id: userId, dimension_name: 'Health', color_code: '#d4b5b0', icon_name: 'Heart', display_order: 0 },
            { user_id: userId, dimension_name: 'Work', color_code: '#849b87', icon_name: 'Briefcase', display_order: 1 },
            { user_id: userId, dimension_name: 'Study', color_code: '#a3b8a6', icon_name: 'Book', display_order: 2 },
            { user_id: userId, dimension_name: 'Wealth', color_code: '#e8d5c4', icon_name: 'DollarSign', display_order: 3 },
            { user_id: userId, dimension_name: 'Family', color_code: '#c49eb3', icon_name: 'Users', display_order: 4 },
            { user_id: userId, dimension_name: 'Leisure', color_code: '#9ca3af', icon_name: 'Coffee', display_order: 5 }
        ];

        const { data: newDims, error: insertDimError } = await supabase.from('dimensions').insert(defaultDims).select();
        if (insertDimError) throw insertDimError;
        dimensions = newDims;

        // Also ensure a user_profile exists
        const { data: profiles } = await supabase.from('user_profiles').select('*').eq('user_id', userId);
        if (!profiles || profiles.length === 0) {
            await supabase.from('user_profiles').insert({ user_id: userId, nickname: 'Pioneer' });
        }
    }
    console.log(`✅ Dimensions loaded (${dimensions.length} total).`);

    console.log("3. Generating records...");
    const recordsToInsert = [];

    let currentDate = new Date(START_DATE);
    let daysCount = 0;

    while (currentDate <= END_DATE) {
        const currentCycle = Math.floor(daysCount / CYCLE_LENGTH_DAYS) + 1;

        // Skip the configured blank cycle (e.g. Cycle 3 is empty)
        if (currentCycle !== BLANK_CYCLE) {

            const dimsToFillCount = Math.floor(Math.random() * 4) + 3; // Fill 3 to 6 dimensions
            const shuffledDims = [...dimensions].sort(() => 0.5 - Math.random());
            const selectedDims = shuffledDims.slice(0, dimsToFillCount);

            for (const dim of selectedDims) {
                let note = "";
                let expense = 0;

                switch (dim.dimension_name) {
                    case 'Health':
                        note = getRandomItem(HEALTH_NOTES);
                        break;
                    case 'Work':
                        note = getRandomItem(WORK_NOTES);
                        break;
                    case 'Study':
                        note = getRandomItem(STUDY_NOTES);
                        break;
                    case 'Wealth':
                        note = getRandomItem(WEALTH_NOTES);
                        expense = getRandomExpense();
                        break;
                    case 'Family':
                        note = getRandomItem(FAMILY_NOTES);
                        expense = getRandomExpense() > 0 ? Math.floor(Math.random() * 50) : 0;
                        break;
                    case 'Leisure':
                        note = getRandomItem(LEISURE_NOTES);
                        expense = getRandomExpense() > 0 ? Math.floor(Math.random() * 30) : 0;
                        break;
                }

                recordsToInsert.push({
                    user_id: userId,
                    dimension_id: dim.id,
                    cycle_number: currentCycle,
                    day_in_cycle: (daysCount % CYCLE_LENGTH_DAYS) + 1,
                    content: note,
                    expense_amount: expense,
                    record_date: currentDate.toISOString().split('T')[0],
                    ai_summary: null
                });
            }
        }

        currentDate.setDate(currentDate.getDate() + 1);
        daysCount++;
    }

    console.log(`Generated ${recordsToInsert.length} records. Inserting into Supabase...`);

    // Insert in chunks
    const chunkSize = 100;
    for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
        const chunk = recordsToInsert.slice(i, i + chunkSize);
        const { error: insertError } = await supabase.from('daily_records').insert(chunk);
        if (insertError) {
            console.error("Insert error:", insertError);
            throw insertError;
        }
        console.log(`✅ Inserted chunk ${Math.floor(i / chunkSize) + 1} / ${Math.ceil(recordsToInsert.length / chunkSize)}`);
    }

    // Update Profile Nickname
    await supabase.from('user_profiles').update({ nickname: '10D Pioneer' }).eq('user_id', userId);

    console.log("\n🎉 Seeding Complete!");
    console.log("-----------------------------------------");
    console.log(`Test Email:    ${TEST_EMAIL}`);
    console.log(`Test Password: ${TEST_PASSWORD}`);
    console.log(`Time Span:     ${START_DATE.toISOString().split('T')[0]} to ${END_DATE.toISOString().split('T')[0]}`);
    console.log(`Blank Cycle:   #${BLANK_CYCLE} is skipped as requested.`);
    console.log("-----------------------------------------");
}

seed().catch(console.error);
