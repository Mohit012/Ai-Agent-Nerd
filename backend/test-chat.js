async function test() {
  try {
    let regRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        email: 'test123456@example.com',
        password: 'password123'
      })
    });
    let regData = await regRes.json();
    
    if (!regRes.ok) {
      regRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test123456@example.com',
          password: 'password123'
        })
      });
      regData = await regRes.json();
    }

    const token = regData.token;
    console.log('Got token');

    const chatRes = await fetch('http://localhost:5000/api/chat/message', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ message: 'Hello!' })
    });
    console.log('Chat status:', chatRes.status);
    const chatData = await chatRes.json();
    console.dir(chatData, { depth: null });

  } catch (err) {
    console.error('Error:', err);
  }
}
test();
