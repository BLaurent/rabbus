var Events = require("events");
var util = require("util");
var when = require("when");

var Consumer = require("../consumer");
var defaults = require("./defaults");

// Subscriber
// --------

function Subscriber(rabbit, options){
  Consumer.call(this, rabbit, options, defaults);
}

util.inherits(Subscriber, Consumer);

// Instance Methods
// ----------------

Subscriber.prototype._start = function(){
  if (this._startPromise){
    return this._startPromise;
  }

  var that = this;
  var rabbit = this.rabbit;
  var connectionName = this.options.connectionName;
  var options = this.options;
  var queueOptions = options.queue;
  var exchangeOptions = options.exchange;

  this._startPromise = when.promise(function(resolve, reject){

    var qP = rabbit.addQueue(queueOptions.name, queueOptions, connectionName);
    var exP = rabbit.addExchange(
      exchangeOptions.name,
      exchangeOptions.type,
      exchangeOptions,
      connectionName
    );

    when.all([exP, qP]).then(function(){

      rabbit
        .bindQueue(exchangeOptions.name, queueOptions.name, options.routingKeys, connectionName)
        .then(function(){
          resolve();
        })
        .then(null, function(err){
          reject(err);
        });

    }).then(null, function(err){
      reject(err);
    });

  });

  return this._startPromise;
};

Subscriber.prototype.subscribe = function(cb){
  var that = this;
  var rabbit = this.rabbit;
  var queue = this.options.queue.name;
  var messageType = this.options.messageType;
  var middleware = this.middleware;

  this._start().then(function(){

    that.emit("ready");

    var handler = middleware.prepare(function(config){
      config.on("ack", that.emit.bind(that, "ack"));
      config.on("nack", that.emit.bind(that, "nack"));
      config.on("reject", that.emit.bind(that, "reject"));
      config.on("error", that.emit.bind(that, "error"));

      config.last(function(msg, properties, actions){
        try {
          cb(msg);
          actions.ack();
        } catch(ex) {
          actions.nack();
          that.emitError(ex);
        }
      }, that);
    });

    that.subscription = rabbit.handle(messageType, handler);
    rabbit.startSubscription(queue, that.options.connectionName);

  }).then(null, function(err){
    that.emitError(err);
  });
};

// Exports
// -------

module.exports = Subscriber;
