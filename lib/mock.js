/*
 * Mock XMLHttpRequest (see http://www.w3.org/TR/XMLHttpRequest)
 *
 * Written by Philipp von Weitershausen <philipp@weitershausen.de>
 * Released under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * For test interaction it exposes the following attributes:
 *
 * - method, url, urlParts, async, user, password
 * - requestText
 * 
 * as well as the following methods:
 *
 * - getRequestHeader(header)
 * - setResponseHeader(header, value)
 * - receive(status, data)
 * - err(exception)
 * - authenticate(user, password)
 *
 */
function MockHttpRequest () {
    // These are internal flags and data structures
    this.error = false;
    this.sent = false;
    this.requestHeaders = {};
    this.responseHeaders = {};
}
MockHttpRequest.prototype = {

    statusReasons: {
        100: 'Continue',
        101: 'Switching Protocols',
        102: 'Processing',
        200: 'OK',
        201: 'Created',
        202: 'Accepted',
        203: 'Non-Authoritative Information',
        204: 'No Content',
        205: 'Reset Content',
        206: 'Partial Content',
        207: 'Multi-Status',
        300: 'Multiple Choices',
        301: 'Moved Permanently',
        302: 'Moved Temporarily',
        303: 'See Other',
        304: 'Not Modified',
        305: 'Use Proxy',
        307: 'Temporary Redirect',
        400: 'Bad Request',
        401: 'Unauthorized',
        402: 'Payment Required',
        403: 'Forbidden',
        404: 'Not Found',
        405: 'Method Not Allowed',
        406: 'Not Acceptable',
        407: 'Proxy Authentication Required',
        408: 'Request Time-out',
        409: 'Conflict',
        410: 'Gone',
        411: 'Length Required',
        412: 'Precondition Failed',
        413: 'Request Entity Too Large',
        414: 'Request-URI Too Large',
        415: 'Unsupported Media Type',
        416: 'Requested range not satisfiable',
        417: 'Expectation Failed',
        422: 'Unprocessable Entity',
        423: 'Locked',
        424: 'Failed Dependency',
        500: 'Internal Server Error',
        501: 'Not Implemented',
        502: 'Bad Gateway',
        503: 'Service Unavailable',
        504: 'Gateway Time-out',
        505: 'HTTP Version not supported',
        507: 'Insufficient Storage'
    },

    /*** State ***/

    UNSENT: 0,
    OPENED: 1,
    HEADERS_RECEIVED: 2,
    LOADING: 3,
    DONE: 4,
    readyState: 0,


    /*** Request ***/

    open: function (method, url, async, user, password) {
        if (typeof method !== "string") {
            throw "INVALID_METHOD";
        }
        switch (method.toUpperCase()) {
        case "CONNECT":
        case "TRACE":
        case "TRACK":
            throw "SECURITY_ERR";

        case "DELETE":
        case "GET":
        case "HEAD":
        case "OPTIONS":
        case "POST":
        case "PUT":
            method = method.toUpperCase();
        }
        this.method = method;

        if (typeof url !== "string") {
            throw "INVALID_URL";
        }
        this.url = url;
        this.urlParts = this.parseUri(url);

        if (async === undefined) {
            async = true;
        }
        this.async = async;
        this.user = user;
        this.password = password;

        this.readyState = this.OPENED;
        this.onreadystatechange();
    },

    setRequestHeader: function (header, value) {
        header = header.toLowerCase();

        switch (header) {
        case "accept-charset":
        case "accept-encoding":
        case "connection":
        case "content-length":
        case "cookie":
        case "cookie2":
        case "content-transfer-encoding":
        case "date":
        case "expect":
        case "host":
        case "keep-alive":
        case "referer":
        case "te":
        case "trailer":
        case "transfer-encoding":
        case "upgrade":
        case "user-agent":
        case "via":
            return;
        }
        if ((header.substr(0, 6) === "proxy-")
            || (header.substr(0, 4) === "sec-")) {
            return;
        }

        //TODO if this is called multiple times, should be append
        // rather than replace?
        this.requestHeaders[header] = value;
    },

    send: function (data) {
        if ((this.readyState !== this.OPENED)
            || this.sent) {
            throw "INVALID_STATE_ERR";
        }
        if ((this.method === "GET") || (this.method === "HEAD")) {
            data = null;
        }

        //TODO set Content-Type header?
        this.error = false;
        this.sent = true;
        this.onreadystatechange();

        // fake send
        this.requestText = data;
        this.onsend();
    },

    abort: function () {
        this.responseText = null;
        this.error = true;
        for (var header in this.requestHeaders) {
            delete this.requestHeaders[header];
        }
        delete this.requestText;
        this.onreadystatechange();
        this.onabort();
        this.readyState = this.UNSENT;
    },


    /*** Response ***/

    status: 0,
    statusText: "",

    getResponseHeader: function (header) {
        if ((this.readyState === this.UNSENT)
            || (this.readyState === this.OPENED)
            || this.error) {
            return null;
        }
        return this.responseHeaders[header.toLowerCase()];
    },

    getAllResponseHeaders: function () {
        var r = "";
        for (var header in this.responseHeaders) {
            if ((header === "set-cookie") || (header === "set-cookie2")) {
                continue;
            }
            //TODO title case header
            r += header + ": " + this.responseHeaders[header] + "\r\n";
        }
        return r;
    },

    responseText: "",
    responseXML: undefined, //TODO


    /*** See http://www.w3.org/TR/progress-events/ ***/

    onload: function () {
        // Instances should override this.
    },

    onprogress: function () {
        // Instances should override this.
    },

    onerror: function () {
        // Instances should override this.
    },

    onabort: function () {
        // Instances should override this.
    },

    onreadystatechange: function () {
        // Instances should override this.
    },


    /*** Properties and methods for test interaction ***/

    onsend: function () {
        // Instances should override this.
    },

    getRequestHeader: function (header) {
        return this.requestHeaders[header.toLowerCase()];
    },

    setResponseHeader: function (header, value) {
        this.responseHeaders[header.toLowerCase()] = value;
    },

    // Call this to simulate a server response
    receive: function (status, data) {
        if ((this.readyState !== this.OPENED) || (!this.sent)) {
            // Can't respond to unopened request.
            throw "INVALID_STATE_ERR";
        }

        this.status = status;
        this.statusText = status + " " + this.statusReasons[status];
        this.readyState = this.HEADERS_RECEIVED;
        this.onprogress();
        this.onreadystatechange();

        this.responseText = data;

        this.readyState = this.LOADING;
        this.onprogress();
        this.onreadystatechange();

        this.readyState = this.DONE;
        this.onreadystatechange();
        this.onprogress();
        this.onload();
    },

    // Call this to simulate a request error (e.g. NETWORK_ERR)
    err: function (exception) {
        if ((this.readyState !== this.OPENED) || (!this.sent)) {
            // Can't respond to unopened request.
            throw "INVALID_STATE_ERR";
        }

        this.responseText = null;
        this.error = true;
        for (var header in this.requestHeaders) {
            delete this.requestHeaders[header];
        }
        this.readyState = this.DONE;
        if (!this.async) {
            throw exception;
        }
        this.onreadystatechange();
        this.onerror();
    },

    // Convenience method to verify HTTP credentials
    authenticate: function (user, password) {
        if (this.user) {
            return (user === this.user) && (password === this.password);
        }

        if (this.urlParts.user) {
            return ((user === this.urlParts.user)
                    && (password === this.urlParts.password));
        }

        // Basic auth.  Requires existence of the 'atob' function.
        var auth = this.getRequestHeader("Authorization");
        if (auth === undefined) {
            return false;
        }
        if (auth.substr(0, 6) !== "Basic ") {
            return false;
        }
        if (typeof atob !== "function") {
            return false;
        }
        auth = atob(auth.substr(6));
        var pieces = auth.split(':');
        var requser = pieces.shift();
        var reqpass = pieces.join(':');
        return (user === requser) && (password === reqpass);
    },

    // Parse RFC 3986 compliant URIs.
    // Based on parseUri by Steven Levithan <stevenlevithan.com>
    // See http://blog.stevenlevithan.com/archives/parseuri
    parseUri: function (str) {
        var pattern = /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/;
        var key = ["source", "protocol", "authority", "userInfo", "user",
                   "password", "host", "port", "relative", "path",
                   "directory", "file", "query", "anchor"];
        var querypattern = /(?:^|&)([^&=]*)=?([^&]*)/g;

        var match = pattern.exec(str);
		var uri = {};
		var i = 14;
	    while (i--) {
            uri[key[i]] = match[i] || "";
        }

	    uri.queryKey = {};
	    uri[key[12]].replace(querypattern, function ($0, $1, $2) {
		    if ($1) {
                uri.queryKey[$1] = $2;
            }
	    });

	    return uri;
    }
};


/*
 * A small mock "server" that intercepts XMLHttpRequest calls and
 * diverts them to your handler.
 *
 * Usage:
 *
 * 1. Initialize with either
 *       var server = new MockHttpServer(your_request_handler);
 *    or
 *       var server = new MockHttpServer();
 *       server.handle = function (request) { ... };
 *
 * 2. Call server.start() to start intercepting all XMLHttpRequests.
 *
 * 3. Do your tests.
 *
 * 4. Call server.stop() to tear down.
 *
 * 5. Profit!
 */
function MockHttpServer (handler) {
    if (handler) {
        this.handle = handler;
    }
};
MockHttpServer.prototype = {

    start: function () {
        var self = this;

        function Request () {
            this.onsend = function () {
                self.handle(this);
            };
            MockHttpRequest.apply(this, arguments);
        }
        Request.prototype = MockHttpRequest.prototype;

        window.OriginalHttpRequest = window.XMLHttpRequest;
        window.XMLHttpRequest = Request;
    },

    stop: function () {
        window.XMLHttpRequest = window.OriginalHttpRequest;
    },

    handle: function (request) {
        // Instances should override this.
    }
};
