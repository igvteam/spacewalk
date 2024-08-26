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

import {setURLShortener} from './shareHelper.js'
import { getShareURL } from "../spacewalkSession.js"

let shareModal

function createShareWidgets({ modalElement, inputElement, button }) {

    shareModal = new bootstrap.Modal(modalElement)

    modalElement.addEventListener('shown.bs.modal', async () => {
        inputElement.value = await getShareURL()
        inputElement.focus()
        inputElement.select()
    });

    button.addEventListener('click', async () => {
        try {
            inputElement.focus()
            inputElement.select()
            await navigator.clipboard.writeText(inputElement.value)
            shareModal.hide()
        } catch (error) {
            console.error('The Share widget failed to copy to the clipboard: ', error);
        }
    });
}

function shareWidgetConfigurator(shortenerConfig) {

    setURLShortener(shortenerConfig)

    return {
        modalElement: document.getElementById('igv-app-share-modal'),
        inputElement: document.getElementById('igv-app-share-input'),
        button: document.getElementById('igv-app-copy-link-button'),
    };

}

export {createShareWidgets, shareWidgetConfigurator}
