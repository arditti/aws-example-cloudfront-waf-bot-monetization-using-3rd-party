function handler(event) {
    try {
        var request = event.request;
        var headers = request.headers;

        console.log('CloudFront function invoked');
        console.log('Request URI:');
        console.log(request.uri);

        // Print all headers for debugging
        console.log('All request headers:');
        console.log(JSON.stringify(headers));

        // Print specific headers of interest
        console.log('Host header:');
        console.log(headers.host && headers.host.value);
        console.log('User-Agent header:');
        console.log(headers['user-agent'] && headers['user-agent'].value);
        console.log('WAF Bot header:');
        console.log(headers['x-amzn-waf-bot'] && headers['x-amzn-waf-bot'].value);

        // Check if WAF has marked this request as an AI bot
        if (headers['x-amzn-waf-bot']) {
            var host = headers.host && headers.host.value;
            var uri = request.uri;

            if (!host) {
                console.error('Host header missing, cannot redirect');
                return request;
            }

            var newurl = 'https://tollbit.' + host + uri;
            console.log('AI bot detected, redirecting to:');
            console.log(newurl);

            return {
                statusCode: 302,
                statusDescription: 'Found',
                headers: {
                    location: { value: newurl },
                    'cache-control': { value: 'no-cache, no-store, must-revalidate' }
                }
            };
        }

        // Auto-redirect to index.html if no file was requested
        if (!request.uri || request.uri === '' || request.uri === '/') {
            console.log('Root path requested, redirecting to /index.html');
            request.uri = '/index.html';
        } else if (request.uri.endsWith('/')) {
            console.log('Directory path requested, appending index.html to:');
            console.log(request.uri);
            request.uri += 'index.html';
        }

        console.log('Final request URI:');
        console.log(request.uri);
        return request;

    } catch (error) {
        console.error('CloudFront function error:');
        console.error(error.message);
        // Return original request on error to avoid breaking the site
        return event.request;
    }
}