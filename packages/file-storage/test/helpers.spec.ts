import { extractRegionFromEndpoint } from '../src/file-storage-s3.class';

describe('extractRegionFromEndpoint correctly returns the region or throws an error', () => {
  const testStrings = [
    ['s3.us-east-2.amazonaws.com', 'us-east-2'],
    ['s3-fips.us-east-2.amazonaws.com', 'us-east-2'],
    ['s3.dualstack.us-east-2.amazonaws.com', 'us-east-2'],
    ['s3-fips.dualstack.us-east-2.amazonaws.com', 'us-east-2'],
    ['account-id.s3-control.us-east-2.amazonaws.com', 'us-east-2'],
    ['account-id.s3-control-fips.us-east-2.amazonaws.com', 'us-east-2'],
    ['account-id.s3-control.dualstack.us-east-2.amazonaws.com', 'us-east-2'],
    ['account-id.s3-control-fips.dualstack.us-east-2.amazonaws.com', 'us-east-2'],
    ['s3-accesspoint.us-east-2.amazonaws.com', 'us-east-2'],
    ['s3-accesspoint-fips.us-east-2.amazonaws.com', 'us-east-2'],
    ['s3-accesspoint.dualstack.us-east-2.amazonaws.com', 'us-east-2'],
    ['s3-accesspoint-fips.dualstack.us-east-2.amazonaws.com', 'us-east-2'],
    ['s3.eu-central-1.amazonaws.com', 'eu-central-1'],
  ];

  testStrings.forEach(([input, expected]) => {
    it(`extractRegionFromEndpoint("${input}") returns "${expected}"`, () => {
      expect(extractRegionFromEndpoint(input)).toBe(expected);
    });
  });

  it('extractRegionFromEndpoint("s3.amazonaws.com") throws an error', () => {
    const expectedError = new Error('Please add a valid region or endpoint');
    expect(() => extractRegionFromEndpoint('s3.amazonaws.com')).toThrow(expectedError);
  });

  it('extractRegionFromEndpoint(undefined) throws an error', () => {
    const expectedError = new Error('Please add a valid region or endpoint');
    expect(() => extractRegionFromEndpoint(undefined)).toThrow(expectedError);
  });
});