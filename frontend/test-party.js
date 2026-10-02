
const jwt = require('jsonwebtoken');
const token = jwt.sign({
  'https://daml.com/ledger-api': {
    'ledgerId': 'sandbox',
    'applicationId': 'weep-app',
    'actAs': ['Merchant'],
    'admin': true
  }
}, 'secret', { algorithm: 'HS256' });

fetch('http://172.28.133.92:7575/v1/parties/allocate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({ identifierHint: 'Merchant' })
}).then(r => r.json()).then(console.log);

