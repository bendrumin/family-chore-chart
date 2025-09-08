#!/usr/bin/env node

// ChoreStar Migration Test Script
// This script tests the database migration and app functionality

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = 'https://kyzgmhcismrnjlnddyyl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5emdtaGNpc21ybmpsbmRkeXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDUxOTMsImV4cCI6MjA2ODYyMTE5M30.WejJ7dZjVeHP4wN990woeld4GBqT8GAHB1HDvJjv_K4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(testName, passed, message = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}${message ? ': ' + message : ''}`);
    
    testResults.tests.push({ name: testName, passed, message });
    if (passed) {
        testResults.passed++;
    } else {
        testResults.failed++;
    }
}

async function testDatabaseConnection() {
    try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        if (error) throw error;
        logTest('Database Connection', true, 'Successfully connected to Supabase');
        return true;
    } catch (error) {
        logTest('Database Connection', false, error.message);
        return false;
    }
}

async function testCoreTables() {
    const tables = ['profiles', 'children', 'chores', 'chore_completions'];
    let allExist = true;
    
    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error && error.code === 'PGRST116') {
                logTest(`Table ${table}`, true, 'Table exists (empty)');
            } else if (error) {
                logTest(`Table ${table}`, false, error.message);
                allExist = false;
            } else {
                logTest(`Table ${table}`, true, `Table exists with ${data.length} records`);
            }
        } catch (error) {
            logTest(`Table ${table}`, false, error.message);
            allExist = false;
        }
    }
    
    return allExist;
}

async function testMissingColumns() {
    const columnTests = [
        { table: 'children', column: 'avatar_url' },
        { table: 'children', column: 'avatar_file' },
        { table: 'chores', column: 'notes' },
        { table: 'chores', column: 'color' },
        { table: 'chores', column: 'icon' }
    ];
    
    let allColumnsExist = true;
    
    for (const { table, column } of columnTests) {
        try {
            // Try to select the column - if it doesn't exist, we'll get an error
            const { data, error } = await supabase.from(table).select(column).limit(1);
            if (error && error.message.includes('column') && error.message.includes('does not exist')) {
                logTest(`Column ${table}.${column}`, false, 'Column missing - needs migration');
                allColumnsExist = false;
            } else if (error) {
                logTest(`Column ${table}.${column}`, false, error.message);
                allColumnsExist = false;
            } else {
                logTest(`Column ${table}.${column}`, true, 'Column exists');
            }
        } catch (error) {
            logTest(`Column ${table}.${column}`, false, error.message);
            allColumnsExist = false;
        }
    }
    
    return allColumnsExist;
}

async function testContactSubmissionsTable() {
    try {
        const { data, error } = await supabase.from('contact_submissions').select('*').limit(1);
        if (error && error.code === 'PGRST116') {
            logTest('Contact Submissions Table', true, 'Table exists (empty)');
            return true;
        } else if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
            logTest('Contact Submissions Table', false, 'Table missing - needs migration');
            return false;
        } else if (error) {
            logTest('Contact Submissions Table', false, error.message);
            return false;
        } else {
            logTest('Contact Submissions Table', true, `Table exists with ${data.length} records`);
            return true;
        }
    } catch (error) {
        logTest('Contact Submissions Table', false, error.message);
        return false;
    }
}

async function testFunctions() {
    try {
        // Test get_week_start function
        const { data, error } = await supabase.rpc('get_week_start');
        if (error) {
            logTest('get_week_start Function', false, error.message);
            return false;
        } else {
            logTest('get_week_start Function', true, 'Function exists and works');
        }
        
        // Test get_child_streak function (if we have children)
        const { data: children } = await supabase.from('children').select('id').limit(1);
        if (children && children.length > 0) {
            const { data: streakData, error: streakError } = await supabase.rpc('get_child_streak', {
                p_child_id: children[0].id
            });
            if (streakError) {
                logTest('get_child_streak Function', false, streakError.message);
            } else {
                logTest('get_child_streak Function', true, `Function works (streak: ${streakData})`);
            }
        } else {
            logTest('get_child_streak Function', true, 'Function exists (no children to test with)');
        }
        
        return true;
    } catch (error) {
        logTest('Functions', false, error.message);
        return false;
    }
}

async function testViews() {
    try {
        const { data, error } = await supabase.from('family_dashboard_view').select('*').limit(1);
        if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
            logTest('Family Dashboard View', false, 'View missing - needs migration');
            return false;
        } else if (error) {
            logTest('Family Dashboard View', false, error.message);
            return false;
        } else {
            logTest('Family Dashboard View', true, `View exists with ${data.length} records`);
            return true;
        }
    } catch (error) {
        logTest('Family Dashboard View', false, error.message);
        return false;
    }
}

async function testAppFunctionality() {
    console.log('\n🧪 Testing App Functionality...');
    
    // Test creating a test profile (if possible)
    try {
        const testEmail = `test-${Date.now()}@example.com`;
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: 'testpassword123',
            options: {
                data: {
                    family_name: 'Test Family'
                }
            }
        });
        
        if (error) {
            logTest('User Registration', false, error.message);
        } else {
            logTest('User Registration', true, 'Registration works');
            
            // Clean up test user
            if (data.user) {
                await supabase.auth.admin.deleteUser(data.user.id);
            }
        }
    } catch (error) {
        logTest('User Registration', false, error.message);
    }
}

async function runMigrationTest() {
    console.log('🚀 Starting ChoreStar Migration Test...\n');
    
    // Test 1: Database Connection
    const connected = await testDatabaseConnection();
    if (!connected) {
        console.log('\n❌ Cannot proceed - database connection failed');
        return;
    }
    
    // Test 2: Core Tables
    console.log('\n📊 Testing Core Tables...');
    const tablesExist = await testCoreTables();
    
    // Test 3: Missing Columns
    console.log('\n🔍 Testing for Missing Columns...');
    const columnsExist = await testMissingColumns();
    
    // Test 4: Contact Submissions Table
    console.log('\n📧 Testing Contact Submissions Table...');
    const contactTableExists = await testContactSubmissionsTable();
    
    // Test 5: Functions
    console.log('\n⚙️  Testing Database Functions...');
    const functionsExist = await testFunctions();
    
    // Test 6: Views
    console.log('\n📈 Testing Database Views...');
    const viewsExist = await testViews();
    
    // Test 7: App Functionality
    await testAppFunctionality();
    
    // Summary
    console.log('\n📋 Test Summary:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Total: ${testResults.passed + testResults.failed}`);
    
    // Migration Recommendation
    console.log('\n🎯 Migration Recommendation:');
    if (testResults.failed === 0) {
        console.log('✅ All tests passed! Database is already up to date.');
    } else {
        console.log('⚠️  Some tests failed. Migration is recommended.');
        console.log('📝 Run the migration script: backend/supabase/apply-missing-schema.sql');
    }
    
    // Save detailed results
    const reportPath = path.join(__dirname, 'migration-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
            passed: testResults.passed,
            failed: testResults.failed,
            total: testResults.passed + testResults.failed
        },
        tests: testResults.tests,
        recommendation: testResults.failed === 0 ? 'No migration needed' : 'Migration recommended'
    }, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    return testResults.failed === 0;
}

// Run the test
if (require.main === module) {
    runMigrationTest()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Test script failed:', error);
            process.exit(1);
        });
}

module.exports = { runMigrationTest, testResults };
