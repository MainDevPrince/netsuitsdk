/*
 ** Copyright (c) 2021 Oracle and/or its affiliates.  All rights reserved.
 ** Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.
 */
'use strict';

const Command = require('../../Command');
const ValidateAction = require('./ValidateAction');
const ValidateInputHandler = require('./ValidateInputHandler');
const ValidateOutputHandler = require('./ValidateOutputHandler');

module.exports = {
	create(options) {
		return Command.Builder.withOptions(options)
			.withAction(ValidateAction)
			.withInput(ValidateInputHandler)
			.withOutput(ValidateOutputHandler)
			.build();
	}
};