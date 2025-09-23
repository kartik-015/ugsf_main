module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src','<rootDir>/__tests__'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  }
}
