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
const TEST_PASSWORD = '123456';
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
    let { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
    });

    if (authError) {
        throw new Error(`Auth Error: ${authError.message}`);
    }

    const userId = user.id;
    console.log(`✅ Test User ID: ${userId}`);

    console.log("2. Clearing old records...");
    await supabase.from('records').delete().eq('user_id', userId);

    console.log("3. Fetching dimensions...");
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

    console.log("3. Generating cycles, records, and expenses...");

    // Clear old cycles as well (deletion cascades to records and expenses)
    await supabase.from('cycles').delete().eq('user_id', userId);

    let currentDate = new Date(START_DATE);
    let daysCount = 0;

    // Generate Cycles first
    const cyclesToInsert = [];
    const totalDays = Math.ceil((END_DATE - START_DATE) / (1000 * 60 * 60 * 24));
    let numCycles = Math.ceil(totalDays / CYCLE_LENGTH_DAYS);

    let cycleStartDate = new Date(START_DATE);
    for (let c = 1; c <= numCycles; c++) {
        let cycleEndDate = new Date(cycleStartDate);
        cycleEndDate.setDate(cycleEndDate.getDate() + CYCLE_LENGTH_DAYS - 1);

        let status = c < numCycles ? 'completed' : 'active';

        cyclesToInsert.push({
            user_id: userId,
            cycle_number: c,
            start_date: cycleStartDate.toISOString().split('T')[0],
            end_date: cycleEndDate.toISOString().split('T')[0],
            total_days: CYCLE_LENGTH_DAYS,
            completion_rate: c === BLANK_CYCLE ? 0 : Math.floor(Math.random() * 40 + 60), // Random completion 60-100%
            status: status
        });

        cycleStartDate.setDate(cycleStartDate.getDate() + CYCLE_LENGTH_DAYS);
    }

    // Insert Cycles
    const { data: insertedCycles, error: cycleErr } = await supabase.from('cycles').insert(cyclesToInsert).select();
    if (cycleErr) throw cycleErr;
    console.log(`✅ Generated ${insertedCycles.length} cycles.`);

    // Map cycle number to cycle_id
    const cycleMap = {};
    insertedCycles.forEach(c => { cycleMap[c.cycle_number] = c.id; });

    // Generate Records & Expenses
    const recordsToInsert = [];
    // Expenses require a record_id, so we either insert records one by one or fetch them.
    // To be efficient, we'll insert all records, then retrieve them to insert expenses.
    // However, it's easier to just generate everything, insert records, fetch their IDs via date/dimension, then insert expenses.
    // Actually, simpler: Insert records cycle by cycle so we have their IDs, or insert them all and use a bulk match.
    // Let's just generate records first without expenses, then generate expenses.

    const expensesToInsert = [];

    currentDate = new Date(START_DATE);
    daysCount = 0;

    while (currentDate <= END_DATE) {
        const currentCycleNum = Math.floor(daysCount / CYCLE_LENGTH_DAYS) + 1;
        const currentCycleId = cycleMap[currentCycleNum];

        if (currentCycleNum !== BLANK_CYCLE && currentCycleId) {
            const dimsToFillCount = Math.floor(Math.random() * 4) + 3; // Fill 3 to 6 dimensions
            const shuffledDims = [...dimensions].sort(() => 0.5 - Math.random());
            const selectedDims = shuffledDims.slice(0, dimsToFillCount);

            for (const dim of selectedDims) {
                let note = "";
                let expense = 0;
                let category = "Other";
                let itemName = "Miscellaneous";

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
                        category = "Investment/Saving";
                        itemName = "Index Funds / Stocks";
                        break;
                    case 'Family':
                        note = getRandomItem(FAMILY_NOTES);
                        expense = getRandomExpense() > 0 ? Math.floor(Math.random() * 50) : 0;
                        category = "Dining";
                        itemName = "Family Dinner";
                        break;
                    case 'Leisure':
                        note = getRandomItem(LEISURE_NOTES);
                        expense = getRandomExpense() > 0 ? Math.floor(Math.random() * 30) : 0;
                        category = "Entertainment";
                        itemName = "Movie Ticket / Game";
                        break;
                }

                // Temporary object to hold expense data to link later
                recordsToInsert.push({
                    _expense: expense > 0 ? { amount: expense, category, itemName } : null,
                    recordData: {
                        user_id: userId,
                        cycle_id: currentCycleId,
                        dimension_id: dim.id,
                        record_date: currentDate.toISOString().split('T')[0],
                        content: note,
                        status: 'published'
                    }
                });
            }
        }

        currentDate.setDate(currentDate.getDate() + 1);
        daysCount++;
    }

    console.log(`Generated ${recordsToInsert.length} records. Inserting into Supabase...`);

    // Insert records in chunks and capture them to insert expenses
    const chunkSize = 100;
    for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
        const chunk = recordsToInsert.slice(i, i + chunkSize);

        // We need to insert records and get their IDs back to link expenses
        const pureRecords = chunk.map(c => c.recordData);
        const { data: insertedChunk, error: insertError } = await supabase.from('records').insert(pureRecords).select();

        if (insertError) {
            console.error("Insert error:", insertError);
            throw insertError;
        }

        // Match inserted records with our temporary objects to build expenses
        for (let j = 0; j < insertedChunk.length; j++) {
            const dbRecord = insertedChunk[j];
            // Find corresponding _expense (assuming same order returned by Supabase, typically true for bulk inserts of this size without ordering constraints)
            // To be absolutely safe, match by dimension_id and date
            const original = chunk.find(c => c.recordData.dimension_id === dbRecord.dimension_id && c.recordData.record_date === dbRecord.record_date);

            if (original && original._expense) {
                expensesToInsert.push({
                    record_id: dbRecord.id,
                    user_id: userId,
                    cycle_id: dbRecord.cycle_id,
                    category: original._expense.category,
                    item_name: original._expense.itemName,
                    amount: original._expense.amount,
                    expense_date: dbRecord.record_date
                });
            }
        }

        console.log(`✅ Inserted records chunk ${Math.floor(i / chunkSize) + 1} / ${Math.ceil(recordsToInsert.length / chunkSize)}`);
    }

    if (expensesToInsert.length > 0) {
        console.log(`Inserting ${expensesToInsert.length} expenses...`);
        const { error: expErr } = await supabase.from('expenses').insert(expensesToInsert);
        if (expErr) throw expErr;
        console.log(`✅ Copied expenses successfully.`);
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
