var rabbit = require("wascally");

var Sender = require("../lib/send-rec/sender");
var Receiver = require("../lib/send-rec/receiver");

function reportErr(err){
  setImmediate(function(){
    console.log(err.stack);
    throw err;
  });
}

describe("send / receive", function(){
  var msgType1 = "send-receive.messageType.1";
  var ex1 = "send-receive.ex.1";
  var q1 = "send-receive.q.1";
  var rKey = "test.key";

  var exchangeConfig = {
    name: ex1,
    autoDelete: true
  };

  describe("given a receiver in place, when sending a message", function(){
    var msg1, send, rec;
    var sendHandled, recHandled;
    var sendMessage;

    beforeEach(function(done){
      msg1 = {foo: "bar"};

      send = new Sender(rabbit, {
        exchange: exchangeConfig,
        messageType: msgType1,
        routingKey: rKey
      });
      send.on("error", reportErr);

      rec = new Receiver(rabbit, {
        exchange: exchangeConfig,
        queue: {
          name: q1,
          autoDelete: true
        },
        messageType: msgType1,
        routingKey: rKey
      });
      rec.on("error", reportErr);

      rec.receive(function(data, ack){
        ack();
        sendMessage = data;
        done();
      });

      function sendIt(){
        send.send(msg1);
      }

      rec.on("ready", sendIt);
    });

    it("receiver should receive the message", function(){
      expect(sendMessage.foo).toBe(msg1.foo);
    });

  });

  describe("when a receiver throws an error", function(){
    var msg1, send, rec, err;
    var sendHandled, recHandled;
    var sendMessage;
    var nacked = false;
    var handlerError = new Error("error handling message");

    beforeEach(function(done){
      msg1 = {foo: "bar"};

      send = new Sender(rabbit, {
        exchange: exchangeConfig,
        messageType: msgType1,
        routingKey: rKey
      });
      send.on("error", reportErr);

      rec = new Receiver(rabbit, {
        exchange: exchangeConfig,
        queue: {
          name: q1,
          autoDelete: true
        },
        messageType: msgType1,
        routingKey: rKey
      });

      rec.receive(function(data, ack){
        throw handlerError;
      });

      function sendIt(){
        send.send(msg1);
      }

      rec.on("nack", function(){
        nacked = true;
      });

      rec.on("error", function(ex){
        err = ex;
        done();
      });

      rec.on("ready", sendIt);
    });

    it("should emit the error from the receiver", function(){
      expect(err).toBe(handlerError);
    });

    it("should nack the message", function(){
      expect(nacked).toBe(true);
    });
  });

});
