import playCommand from '../play';

describe('Play Command', () => {
  it('should have a data property', () => {
    expect(playCommand.data).toBeDefined();
  });

  it('should have an execute property', () => {
    expect(playCommand.execute).toBeDefined();
  });
});
