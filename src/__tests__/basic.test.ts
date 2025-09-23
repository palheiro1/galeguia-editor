describe('Basic Test Suite', () => {
  it('should pass basic arithmetic', () => {
    expect(2 + 2).toBe(4);
  });

  it('should handle string operations', () => {
    const greeting = 'Hello, World!';
    expect(greeting).toContain('World');
  });

  it('should validate array operations', () => {
    const numbers = [1, 2, 3, 4, 5];
    expect(numbers).toHaveLength(5);
    expect(numbers).toContain(3);
  });
});