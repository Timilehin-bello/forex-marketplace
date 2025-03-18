import { messageQueue } from './message-queue';

describe('messageQueue', () => {
  it('should work', () => {
    expect(messageQueue()).toEqual('message-queue');
  });
});
