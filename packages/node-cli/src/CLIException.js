/*
** Copyright (c) 2021 Oracle and/or its affiliates.  All rights reserved.
** Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.
*/
'use strict';

module.exports = class CLIException {
	constructor(defaultMessage, infoMessage, translationKey) {
		this._defaultMessage = defaultMessage;
		this._infoMessage = infoMessage;
		this._translationKey = translationKey;
	}

	getInfoMessage() {
		return this._infoMessage;
	}

	getErrorMessage() {
		return this._defaultMessage;
	}
};
