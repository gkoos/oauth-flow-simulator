import chalk from 'chalk';

export default async function apiCommand(verb, path, options, command) {
  // Join path segments to form the full path
  const fullPath = '/' + path.join('/');
  // Determine baseUrl: --base-url > OAUTH_SIM_BASE_URL > --port > default
  let baseUrl = options.baseUrl || process.env.OAUTH_SIM_BASE_URL;
  if (!baseUrl && options.port) {
    baseUrl = `http://localhost:${options.port}`;
  }
  if (!baseUrl) {
    baseUrl = 'http://localhost:3000';
  }
  const url = baseUrl + fullPath;

  const fetchOptions = {
    method: verb.toUpperCase(),
    headers: {
      'Accept': 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  };

  try {
    const response = await fetch(url, fetchOptions);
    if (!response) {
      return;
    }
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    if (response.ok) {
      if (data !== '' && !(typeof data === 'object' && Object.keys(data).length === 0)) {
        console.dir(data, { depth: null, colors: true });
      }
    }
  } catch (err) {
    // Silent fail
  }
}
