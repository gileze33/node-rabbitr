import Rabbitr = require('../');
const rabbit = new Rabbitr({
  url: 'amqp://guest:guest@localhost'
});

rabbit.subscribe('example.queue');
rabbit.bindExchangeToQueue('example.exchange', 'example.queue');
rabbit.on('example.queue', (message) => {
  console.log('Got message', message);
  console.log('Message data is', message.data);

  setTimeout(function() {
    process.exit(0);
  }, 100);
});

rabbit.send('example.exchange', {
  thisIs: 'example-data',
}, err => {
  console.log('Sent message', err);
});
