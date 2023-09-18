let testId = null;
let testRequestNumber = 0;
let testMockNumber = 0;

export function setTestId(str) {
  if (testId && str) {
    throw new Error(
      `MockServerHandler is already configured with a testId. Use setTestId(null) to clear the testId after each test!`
    );
  }
  testRequestNumber = 0;
  testMockNumber = 0;
  testId = str;
}

export const MockServerHandler = {
  request(context, next) {
    if (!testId) {
      throw new Error(
        `MockServerHandler is not configured with a testId. Use setTestId to set the testId for each test`
      );
    }

    const request = Object.assign({}, context.request);
    const isRecording = request.url.endsWith('/__record');

    request.url = request.url.includes('?') ? request.url + '&' : request.url + '?';
    request.url =
      request.url + `__xTestId=${testId}&__xTestRequestNumber=${isRecording ? testMockNumber++ : testRequestNumber++}`;

    request.mode = 'cors';
    request.credentials = 'omit';
    request.referrerPolicy = '';

    return next(request);
  },
};
