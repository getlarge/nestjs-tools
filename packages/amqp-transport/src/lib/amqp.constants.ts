export const AMQP_SEPARATOR = '.';
export const AMQP_DEFAULT_EXCHANGE_TYPE = 'topic';
export const AMQP_DEFAULT_EXCHANGE_OPTIONS = {};
export const CONNECT_FAILED_EVENT = 'connectFailed';
export const CONNECT_FAILED_EVENT_MSG = 'Failed to initialize AMQP connection';
export const RQM_DEFAULT_DELETE_CHANNEL_ON_FAILURE = false;
export const RMQ_DEFAULT_REPLY_QUEUE_OPTIONS = {
  durable: true,
  /* the reply queue is named can only be used by the declaring connection */
  exclusive: true,
  /* default reply queue is named “”, so a new one will be generated at channel setup */
  autoDelete: false,
};

export const RQM_NO_EVENT_HANDLER = (text: TemplateStringsArray, pattern: string) =>
  `An unsupported event was received. It has been negative acknowledged, so it will not be re-delivered. Pattern: ${pattern}`;
export const RQM_NO_MESSAGE_HANDLER = (text: TemplateStringsArray, pattern: string) =>
  `An unsupported message was received. It has been negative acknowledged, so it will not be re-delivered. Pattern: ${pattern}`;
