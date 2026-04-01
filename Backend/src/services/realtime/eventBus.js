const EventEmitter = require('events');


class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
    this.eventLog = [];
    this.maxLogSize = 1000;
  }

  publish(eventType, payload) {
    const event = {
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }
    this.emit(eventType, event);
    this.emit('*', event);
    return event.id;
  }

  subscribe(eventType, handler) {
    this.on(eventType, handler);
    return () => this.off(eventType, handler);
  }

  subscribeOnce(eventType, handler) {
    this.once(eventType, handler);
  }

  getRecentEvents(count = 50, eventType = null) {
    let events = this.eventLog;
    if (eventType) {
      events = events.filter(e => e.type === eventType);
    }
    return events.slice(-count);
  }

  getEventStats() {
    const stats = {};
    for (const event of this.eventLog) {
      stats[event.type] = (stats[event.type] || 0) + 1;
    }
    return {
      totalEvents: this.eventLog.length,
      byType: stats,
      listenerCount: this.listenerCount('*')
    };
  }
}

const eventBus = new EventBus();

module.exports = eventBus;
