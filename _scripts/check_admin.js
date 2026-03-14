const { createClient } = require('@libsql/client');

async function checkAdmin() {
    console.log('Connecting to Turso...');
    const client = createClient({
        url: 'libsql://finance-funk-eduardovba.aws-eu-west-1.turso.io',
        authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzI1MDIxMjgsImlkIjoiMDE5Y2IxNWItMzYwMS03YmI0LThjOGYtNzhlYzg2NDE4MzNkIiwicmlkIjoiZmFmOWUyNzYtNzY3ZC00ZDk4LTg3ZTItNjZkNDJhOGViNzIyIn0.N84N6m8VTkxDQmWL8ZCIdbYdH-Pa3Wb_kVICh1HVhYn5PUD92S35B5lARF5HJ2Xs8yT1W2oW6EB-pm9H1n-SBA'
    });
    
    try {
        const result = await client.execute("SELECT id, email, is_admin FROM users WHERE email = 'duduviana@gmail.com'");
        console.log('Result:', result.rows);
    } catch (e) {
        console.error('Error:', e);
    }
}

checkAdmin();
