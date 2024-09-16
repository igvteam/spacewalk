/*
 *  The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,  FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */
import {bitlyShortener, googleShortener, tinyURLShortener} from "./urlShortener.js";

let urlShortener;

function setURLShortener(obj) {

    let fn;
    if (typeof obj === "function") {
        fn = obj;

    } else if (obj.provider) {
        if ("tinyURL" === obj.provider) {
            fn = tinyURLShortener(obj);
        } else if ("bitly" === obj.provider && obj.apiKey) {
            fn = bitlyShortener(obj.apiKey);
        } else if ("google" === obj.provider && obj.apiKey) {
            fn = googleShortener(obj.apiKey);
        } else {
            const error = new Error(`Unknown URL shortener provider: ${obj.provider}`)
            console.error(error.message)
            alert(error.message)
        }
    } else {
        const error = new Error(`URL shortener object must either be an object specifying a provider and apiKey, or a function`)
        console.error(error.message)
        alert(error.message)
    }

    if (fn) {
        urlShortener =
            {
                shortenURL: fn
            }
    }

    return fn;

}

function shortSessionURL(base, session) {

    const url = base + "?sessionURL=blob:" + session;

    return shortenURL(url)

}

function shortenURL(url) {
    if (urlShortener) {
        return urlShortener.shortenURL(url);
    } else {
        return Promise.resolve(url);
    }
}

export { setURLShortener, shortSessionURL, shortenURL }
