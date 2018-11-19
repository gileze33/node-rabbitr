import Rabbitr = require('../');
import { expect } from 'chai';
import { v4 } from 'node-uuid';
import { fromCallback } from 'promise-cb';

describe('rabbitr#backoff', function() {
  let rabbit: Rabbitr;
  before(() =>
    (
      rabbit = new Rabbitr({
        url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost/%2F',
      })
    )
  );

  const createdExchanges: string[] = [];
  const createdQueues: string[] = [];

  after(() =>
    Promise.all([
      // cleanup
      ...createdExchanges.map(exchangeName =>
        rabbit._cachedChannel.deleteExchange(exchangeName, {})
      ),
      ...createdQueues.map(queueName =>
        rabbit._cachedChannel.deleteQueue(queueName, {})
      ),
    ]).then(() => rabbit.destroy())
  );

  it('should take at least 1 second to backoff', function(done) {
    this.timeout(60000);

    const exchangeName = v4() + '.backoff_test';
    const queueName = v4() + '.backoff_test';

    const testData = {
      testProp: 'backoff-example-data-' + queueName
    };

    let receivedIncrementer = 0;
    let lastReceivedUnixMS = null;

    rabbit.subscribe([exchangeName], queueName, {}, (message) => {
      receivedIncrementer++;

      // here we'll assert that the data is still the same
      expect(JSON.stringify(testData)).to.equal(JSON.stringify(message.data));

      // work out how long ago we last received this message
      const nowUnixMS = new Date().getTime();
      if(lastReceivedUnixMS !== null) {
        // check it was over 1 second ago we last received it
        expect(nowUnixMS - lastReceivedUnixMS).to.be.gt(1000);
      }
      lastReceivedUnixMS = nowUnixMS;

      if(receivedIncrementer < 4) {
        message.reject();
      }
      else {
        message.ack();
        setTimeout(() => {
          done();
        }, 100);
      }
    });
    createdQueues.push(queueName);
    createdExchanges.push(exchangeName);

    setTimeout(() => {rabbit.send(exchangeName, testData)}, 200);
  });
});
