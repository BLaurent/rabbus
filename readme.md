![](logo/rabbus-logo.png)

A highly opinionated, yet minimal, set of message bus abstractions for NodeJS.
It is built on top of [RabbitMQ](http://rabbitmq.com), 
with [Wascally](https://github.com/LeanKit-Labs/wascally) as the primary library
for working with RabbitMQ.

## About Rabbus

The service bus implementation is basic, but includes several of the most 
common patterns:

* Send / Receive
* Publish / Subscribe
* Request / Response

The items on the left are "producers" as they produce a message for RabbitMQ
to route and handle. Items on the right are "consumers" as they consume a
message from a queue in RabbitMQ. 

Producers and Consumers inherit from a base class of that name, providing
common functionality and a means by which all producers / consumers can be
extended (see "middleware" below).

## Installing Rabbus

It's all NPM. You're going to want the 'wascally' package with this, so you will
need to do two things:

```
npm install --save wascally
npm install --save rabbus
```

Please note that Wascally is explicitly NOT mentioned as a dependency in the
Rabbus package.json file for runtime dependencies. This is done with intent, to help prevent library
version conflicts.

## Using Rabbus

There are three pairs of objects that come with Rabbus, as noted in the above
patterns. Each of them is meant to be used in combination with it's pair. You
are encouraged, however, not to use them directly. While this is certainly
possible, I find it is more convenient to inherit from these objects at the
point where they need to be used. The configuration of each object can then be
encapsulated for the intended use, allowing easier testing and maintenance.

There are a few commonalities between all of these object pairs. Most notably,
the object that sends a message to RabbitMQ only needs to know about the 
exchange to which it sends. Conversely, the object that consumes a message
from within RabbitMQ needs to know about both the exchange and the queue to 
which it subscribes.

The following provide basic working examples of each object pair. If you would 
like to run these demos for yourself, please see the [demos folder](demos)
of the repository.

Please see the [Wascally](https://github.com/LeanKit-Labs/wascally) documentation for information
on configuring RabbitMQ.

### General Error Handling

In general, each of the objects in Rabbus will emit an "error"
message when an error occurs. You can use standard NodeJS
EventEmitter functions to subscribe / unsubscribe the error
events.

```js
var sub = new Subscriber(...);
sub.on("error", function(err){
  // do something with the err object, here
});
```

## Send / Receive

The Send / Receive object pair uses a direct exchange inside of RabbitMQ, 
allowing you to specify the binding key.

### Set Up A Sender

```js
var util = require("util");
var Rabbus = require("rabbus");

function SomeSender(rabbus){
  Rabbus.Sender.call(this, rabbus, {
    exchange: "send-rec.exchange",
    routingKey: "send-rec.key",
    messageType: "send-rec.messageType"
  });
}

util.inherits(SomeSender, Rabbus.Sender);

var sender = new SomeSender(Rabbus);
var message = {
  place: "world"
};

sender.send(message, function(){
  console.log("sent a message");
});
```

### Sender Options

The following options are available when configuring a sender:

* **exchange** (string): name of the exchange to create and publish to
* **exchange** (object): object literal with options for the exchange
  * **name** (string): name of the exchange to create and publish to
  * **type** (string): type of exchange to use. default is `direct`.
  * **autoDelete** (boolean): delete this exchange when there are no more connections using it. default is `false`.
  * **durable** (boolean): this exchange will survive a shut down / restart of RabbitMQ. default is `true`.
  * **persistent** (boolean): messages published through this exchange will be saved to disk / survive restart of RabbitMQ. default is `true`.
* **messageType** (string): the type of message being published
* **routingKey** (string): the routing key to use for the published message

### Set Up A Receiver

```js
var util = require("util");
var Rabbus = require("rabbus");

function SomeReceiver(rabbus){
  Rabbus.Receiver.call(this, rabbus, {
    exchange: "send-rec.exchange",
    queue: "send-rec.queue",
    routingKey: "send-rec.key",
    messageType: "send-rec.messageType"
  });
}

util.inherits(SomeReceiver, Rabbus.Receiver);

var receiver = new SomeReceiver(Rabbus);

receiver.receive(function(message, done){
  console.log("hello", message.place);
  done();
});
```

### Receiver Options

See Sender options for Exchange definition. The exchange
and queue that you specify in these options will be used to
create the binding between the two.

* **exchange**: (see Sender for options)
* **queue** (string): name of the queue to create and subscribe to
* **queue** (object): object literal with options for the queue
  * **name** (string): name of the queue to create and subscriber to
  * **autoDelete** (boolean): delete this queue when there are no more connections using it. default is `false`.
  * **durable** (boolean): this queue will survive a shut down / restart of RabbitMQ. default is `true`.
* **messageType** (string): the type of message to handle for this subscriber instance
* **routingKey** (string): the routing key to use for binding the exchange and queue
* **routingKey** ([string]): an array of string for the routing key to use for binding the exchange and queue

## Publish / Subscribe

The Publish / Subscribe object pair uses a fanout exchange inside of RabbitMQ, 
allowing you to have as many subscribers as you need. Think of pub/sub as an
event that gets broadcast to anyone that cares, or no one at all if no one is
listening.

### Set Up A Publisher

```js
var util = require("util");
var Rabbus = require("rabbus");

function SomePublisher(rabbus){
  Rabbus.Publisher.call(this, rabbus, {
    exchange: "pub-sub.exchange",
    routingKey: "pub-sub.key",
    messageType: "pub-sub.messageType"
  });
}

util.inherits(SomePublisher, Rabbus.Publisher);

var publisher = new SomePublisher(Rabbus);
var message = {
  place: "world"
};

publisher.publish(message, function(){
  console.log("published an event!");
});
```

### Publisher Options

The following options are available when configuring a publisher:

* **exchange** (string): name of the exchange to create and publish to
* **exchange** (object): object literal with options for the exchange
  * **name** (string): name of the exchange to create and publish to
  * **type** (string): type of exchange to use. default is `fanout`.
  * **autoDelete** (boolean): delete this exchange when there are no more connections using it. default is `false`.
  * **durable** (boolean): this exchange will survive a shut down / restart of RabbitMQ. default is `true`.
  * **persistent** (boolean): messages published through this exchange will be saved to disk / survive restart of RabbitMQ. default is `true`.
* **messageType** (string): the type of message being published
* **routingKey** (string): the routing key to use for the published message

### Set Up A Subscriber

```js
var util = require("util");
var Rabbus = require("rabbus");

function SomeSubscriber(){
  Rabbus.Subscriber.call(this, rabbus, {
    exchange: "pub-sub.exchange",
    queue: "pub-sub.queue",
    routingKey: "pub-sub.key",
    messageType: "pub-sub.messageType"
  });
}

util.inherits(SomeSubscriber, Rabbus.Subscriber);

// ... 

var sub1 = new SomeSubscriber();
sub1.subscribe(function(message){
  console.log("1: hello", message.place);
});

var sub2 = new SomeSubscriber();
sub2.subscribe(function(message){
  console.log("2: hello", message.place);
});

var sub3 = new SomeSubscriber();
sub3.subscribe(function(message){
  console.log("3: hello", message.place);
});
```

### Subscriber Options

See Publisher options for Exchange definition. The exchange
and queue that you specify in these options will be used to
create the binding between the exchange and queue.

* **exchange**: (see Publisher for options)
* **queue** (string): name of the queue to create and subscribe to
* **queue** (object): object literal with options for the queue
  * **name** (string): name of the queue to create and subscriber to
  * **autoDelete** (boolean): delete this queue when there are no more connections using it. default is `false`.
  * **durable** (boolean): this queue will survive a shut down / restart of RabbitMQ. default is `true`.
* **messageType** (string): the type of message to handle for this subscriber instance
* **routingKey** (string): the routing key to use for binding the exchange and queue
* **routingKey** ([string]): an array of string for the routing key to use for binding the exchange and queue

## Request / Response

The request/response pair uses a "topic" exchange. You should set the
routing key via the "routingKey" parameter, but it will default to the 
message type if none is supplied.

With a request/response setup, you can send a request for information and
respond to it. A private, temporary queue will be created for the response
message, ensuring that it gets back to the requester correctly.

### Set Up A Requester

```js
var util = require("util");
var Rabbus = require("rabbus");

function SomeRequester(rabbus){
  Rabbus.Requester.call(this, rabbus, {
    exchange: "req-res.exchange",
    messageType: "req-res.messageType",
    routingKey: "req-res.key"
  });
}

util.inherits(SomeRequester, Rabbus.Requester);

var requester = new SomeRequester(Rabbus);

var msg = {};
requester.request(msg, function(response, done){
  console.log("Hello", response.place);
  done();
});
```

### Requester Options

The following options are available when configuring a requester:

* **exchange** (string): name of the exchange to create and publish to
* **exchange** (object): object literal with options for the exchange
  * **name** (string): name of the exchange to create and publish to
  * **type** (string): type of exchange to use. default is `fanout`.
  * **autoDelete** (boolean): delete this exchange when there are no more connections using it. default is `false`.
  * **durable** (boolean): this exchange will survive a shut down / restart of RabbitMQ. default is `true`.
  * **persistent** (boolean): messages published through this exchange will be saved to disk / survive restart of RabbitMQ. default is `true`.
* **messageType** (string): the type of message being published
* **routingKey** (string): the routing key to use for the published message

### Set up a Responder

```js
var util = require("util");
var Rabbus = require("rabbus");

function SomeResponder(rabbus){
  Rabbus.Responder.call(this, rabbus, {
    exchange: "req-res.exchange",
    queue: {
      name: "req-res.queue",
      limit: 1
    },
    routingKey: "req-res.key",
    messageType: "req-res.messageType"
  });
}

util.inherits(SomeResponder, Rabbus.Responder);

var responder = new SomeResponder(Rabbus);

responder.handle(function(message, respond){
  respond({
    place: "world"
  });
});
```

Note that the responder does the "work" but sends a response back to the
requester, instead of just saying that the work is done. This allows the
requester to receive the response and do something with it.

Also note the "limit" option for the Resonder. This is the "prefetch" limit
for the queue, allowing you to limit the amount of work being done concurrently.

### Responder Options

See Requester options for Exchange definition. The exchange
and queue that you specify in these options will be used to
create the binding between the two.

* **exchange**: (see Requester for options)
* **queue** (string): name of the queue to create and subscribe to
* **queue** (object): object literal with options for the queue
  * **name** (string): name of the queue to create and subscriber to
  * **autoDelete** (boolean): delete this queue when there are no more connections using it. default is `false`.
  * **durable** (boolean): this queue will survive a shut down / restart of RabbitMQ. default is `true`.
* **messageType** (string): the type of message to handle for this subscriber instance
* **routingKey** (string): the routing key to use for binding the exchange and queue
* **routingKey** ([string]): an array of string for the routing key to use for binding the exchange and queue

## Limit Message Processing

If you need to limit the number of messages being processed by any given
messgae handler, you can specify a `limit` in the configuration.

```
function SomeSubscriber(rabbus){
  Rabbus.Subscriber.call(this, rabbus, {
    // ...
    queue: {
      // ...
      limit: 1
    }
  });
}
```

This will limit your `SomeSubscriber` to only working on one message at a time.
When your processing code calls `done`, the next message will be picked up
and processed.

## NoBatch: Ack / Nack Individual Messages

Wascally's default behavior is to batch process `ack` and `nack`
calls on messages. This can lead to an improvement of up to 400%
throughput in processing small things. In scenarios where there
are very long running processes that leave a message unacknowledged
for extended periods, though, this can be troublesome.

To prevent issues with batching ack / nack calls, Wascally and
Rabbus provide a `noBatch` option for Queue definitions.

```js
var Subscriber = new Rabbus.Subscriber({
  // ...
  queue: {
    //... 
    noBatch: true
  }
});
```

The following Rabbus objects provide the `noBatch` feature:

* Rabbus.Receiver
* Rabbus.Subscriber
* Rabbus.Responder

## Extending Rabbus w/ Middleware

Rabbus message Producers and Consumers use a middleware system that allows you 
to extend the capabilities of the bus. To use it, call the `.use` method of any 
given message Consumer object (Receiver, Responder, Subscriber) or Producer 
(Sender, Requester, Publisher). 

The `use` method takes a callback function with a signature that varies depending
on whether you're using a producer or consumer.

### Consumer Middleware

The `use` method on consumers takes a callback with this signature:

```js
consumer.use(function(message, properties, actions){

});
```

The parameters are as follows:

* **message**: the message body
* **properties**: the properties of the message, including headers, etc.
* **actions**: an object containing various methods for interaction with the RabbitMQ message, and to continue the middleware chain
  * **next()**: this middleware is done, and the next one can be called
  * **ack()**: the message is completely processed. acknowledge to the server. prevents any additional middleware from running
  * **nack()**: the message cannot be processed, and should be re-queued for later. prevents any additional middleware from running
  * **reject()**: the message cannot be processed and should not be re-queued. be sure you have a dead-letter queue before using this. prevents any additional middleware from running
  * **reply(msg)**: send a reply back to the requester, during a request/response scenario. prevents any additional middleware from running

#### Consumer Middleware Examples

As an example, you could log every message that gets sent through your consumer:

```js
var mySubscriber = new MySubscriber();

mySubscriber.use(function(message, properties, actions){

  console.log("Got a message. Doing stuff with middleware.");
  console.log(message);

  // allow the middleware chain to continue
  actions.next();
});
```

In another scenario, you may want the middleware to `nack` the message because
some condition is not yet met.

```js
var rec = new SomeReceiver();

rec.use(function(message, properties, actions){

  // check some conditions
  if (message.someData && someOtherSystem.stuffNotReady()){

    // conditions not met. nack the message and try again later
    actions.nack();

  } else {

    // everything is good to go, allow the next middleware to run
    actions.next();

  }
});
```

**WARNING:** If you forget to call `.next()` or one of the other actions,
your message will be stuck in limbo, unacknowledged. 

### Producer Middleware

The `use` method on consumers takes a callback with this signature:

```js
producer.use(function(message, headers, actions){

});
```

The parameters are as follows:

* **message**: the message body, which you can transform as needed
* **headers**: the headers of the message, which can be altered in any way you need
* **actions**: an object containing various methods for interaction with the RabbitMQ message, and to continue the middleware chain
  * **next()**: this middleware is done, and the next one can be called

#### Producer Middleware Examples

You can easily add / change headers or the actual message content in your
producer middleware. Any change you make to the `message` or `headers` objects
will make their way to the next middleware, and ultimately to RabbitMQ as part
of the message.

```js
var myPub = new MyPublisher();

myPub.use(function(message, headers, actions){

  var hasFoo = !!(message.foo);

  if (hasFoo){
    // add data to the message body
    message.bar = "foo is there";
    message.baz = true;
  }

  // add a header to the message properties
  headers.hasFoo = hasFoo;

  // allow the middleware chain to continue
  actions.next();
});
```

**WARNING:** If you forget to call `.next()` in your middleware,
the message will never be published. While this is generally dangerous, it can
be used to stop messages that should not be sent.

### Order Of Middleware Processing

Whether you are using a Producer or Consumer, middleware is processed in the 
order in which it was added: first in, first out.

For example, if you have a consumer that handles a message and then adds
some middleware, you will have the middleware processed first.

```js
sub.handle("message.type", function(msg, done){
  console.log("handler fires last");
  done();
});

sub.use(function(msg, prop, act){
  console.log("first middleware");
  act.next();
});

sub.use(function(msg, prop, act){
  console.log("second middleware");
  act.next();
});

sub.use(function(msg, prop, act){
  console.log("third middleware");
  act.next();
});
```

When this subscriber receives a message to handle, you will see the following:

```
first middleware
second middleware
third middleware
handler fires last
```

It is recommended you add the middleware before adding the `handle`
call. Adding middleware after calling `handle` could allow messages to be
handled before the middleware is in place.

## Legalese

Rabbus is Copyright &copy;2015 Muted Solutions, LLC. All Rights Reserved. 

Rabbus is distributed under the [MIT license](http://mutedsolutions.mit-license.org).
