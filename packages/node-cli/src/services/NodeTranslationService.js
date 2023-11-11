/*
 ** Copyright (c) 2021 Oracle and/or its affiliates.  All rights reserved.
 ** Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.
 */
'use strict';

const path = require('path');
const TranslationService = require('./TranslationService');
const { DEFAULT_MESSAGES_FILE } = require('../ApplicationConstants');
const FileUtils = require('../utils/FileUtils');

class NodeTranslationService extends TranslationService {
	constructor() {
		super();
		const filePath = path.join(__dirname, DEFAULT_MESSAGES_FILE);
		this._MESSAGES = FileUtils.readAsJson(filePath);
	}
}

module.exports = new NodeTranslationService();
