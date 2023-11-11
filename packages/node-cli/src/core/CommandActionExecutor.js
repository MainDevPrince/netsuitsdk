/*
 ** Copyright (c) 2021 Oracle and/or its affiliates.  All rights reserved.
 ** Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.
 */
'use strict';

const assert = require('assert');
const NodeTranslationService = require('./../services/NodeTranslationService');
const { ERRORS, CLI } = require('../services/TranslationKeys');
const { ActionResult } = require('../services/actionresult/ActionResult');
const { lineBreak } = require('../loggers/LoggerConstants');
const ActionResultUtils = require('../utils/ActionResultUtils');
const { unwrapExceptionMessage, unwrapInformationMessage } = require('../utils/ExceptionUtils');
const { getProjectDefaultAuthId } = require('../utils/AuthenticationUtils');
const ExecutionEnvironmentContext = require('../ExecutionEnvironmentContext');

module.exports = class CommandActionExecutor {
	constructor(dependencies) {
		assert(dependencies);
		assert(dependencies.cliConfigurationService);
		assert(dependencies.commandsMetadataService);
		assert(dependencies.log);
		assert(dependencies.sdkPath);

		this._executionPath = dependencies.executionPath;
		this._cliConfigurationService = dependencies.cliConfigurationService;
		this._commandsMetadataService = dependencies.commandsMetadataService;
		this._log = dependencies.log;
		this._sdkPath = dependencies.sdkPath;

		if (!dependencies.executionEnvironmentContext) {
			this._executionEnvironmentContext = new ExecutionEnvironmentContext();
		} else {
			this._executionEnvironmentContext = dependencies.executionEnvironmentContext;
		}
	}

	async executeAction(context) {
		assert(context);
		assert(context.arguments);
		assert(context.commandName);
		assert(typeof context.runInInteractiveMode === 'boolean');

		let commandUserExtension;
		try {
			const commandMetadata = this._commandsMetadataService.getCommandMetadataByName(context.commandName);
			const commandName = context.commandName;

			this._cliConfigurationService.initialize(this._executionPath);
			const projectFolder = this._cliConfigurationService.getProjectFolder(commandName);
			commandUserExtension = this._cliConfigurationService.getCommandUserExtension(commandName);

			const runInInteractiveMode = context.runInInteractiveMode;
			const args = context.arguments;

			const projectConfiguration = commandMetadata.isSetupRequired ? getProjectDefaultAuthId(this._executionPath) : null;
			this._checkCanExecute({ runInInteractiveMode, commandMetadata, projectConfiguration });

			const command = this._getCommand(runInInteractiveMode, projectFolder, commandMetadata);
			const commandArguments = this._extractOptionValuesFromArguments(commandMetadata.options, args);

			const actionResult = await this._executeCommandAction({
				command: command,
				arguments: commandArguments,
				runInInteractiveMode: context.runInInteractiveMode,
				metadata: commandMetadata,
				commandUserExtension: commandUserExtension,
				projectConfiguration: projectConfiguration,
			});
			if (context.runInInteractiveMode) {
				const notInteractiveCommand = ActionResultUtils.extractNotInteractiveCommand(commandName, commandMetadata, actionResult);
				this._log.info(NodeTranslationService.getMessage(CLI.SHOW_NOT_INTERACTIVE_COMMAND_MESSAGE, notInteractiveCommand));
			}
			if (actionResult.isSuccess() && commandUserExtension.onCompleted) {
				commandUserExtension.onCompleted(actionResult);
			} else if (!actionResult.isSuccess() && commandUserExtension.onError) {
				commandUserExtension.onError(ActionResultUtils.getErrorMessagesString(actionResult));
			}
			return actionResult;

		} catch (error) {
			let errorMessage = this._logGenericError(error);
			if (commandUserExtension && commandUserExtension.onError) {
				commandUserExtension.onError(error);
			}
			return ActionResult.Builder.withErrors(Array.isArray(errorMessage) ? errorMessage : [errorMessage]).build();
		}
	}

	_logGenericError(error) {
		let errorMessage = unwrapExceptionMessage(error);
		this._log.error(errorMessage);
		const informativeMessage = unwrapInformationMessage(error);

		if (informativeMessage) {
			this._log.info(`${lineBreak}${informativeMessage}`);
			errorMessage += lineBreak + informativeMessage;
		}
		return errorMessage;
	}

	_checkCanExecute(context) {
		if (context.commandMetadata.isSetupRequired && !context.projectConfiguration) {
			throw NodeTranslationService.getMessage(ERRORS.SETUP_REQUIRED);
		}
		if (context.runInInteractiveMode && !context.commandMetadata.supportsInteractiveMode) {
			throw NodeTranslationService.getMessage(ERRORS.COMMAND_DOES_NOT_SUPPORT_INTERACTIVE_MODE, context.commandMetadata.name);
		}
	}

	_extractOptionValuesFromArguments(options, args) {
		const optionValues = {};
		for (const optionId in options) {
			if (options.hasOwnProperty(optionId) && args.hasOwnProperty(optionId)) {
				optionValues[optionId] = args[optionId];
			}
		}

		return optionValues;
	}

	_getCommand(runInInteractiveMode, projectFolder, commandMetadata) {
		const commandPath = commandMetadata.generator;
		const commandGenerator = require(commandPath);
		if (!commandGenerator) {
			throw `Path ${commandPath} doesn't contain any command`;
		}
		return commandGenerator.create({
			commandMetadata: commandMetadata,
			projectFolder: projectFolder,
			executionPath: this._executionPath,
			runInInteractiveMode: runInInteractiveMode,
			log: this._log,
			sdkPath: this._sdkPath,
			executionEnvironmentContext: this._executionEnvironmentContext,
		});
	}

	async _executeCommandAction(options) {
		const command = options.command;
		const projectConfiguration = options.projectConfiguration;
		const isSetupRequired = options.metadata.isSetupRequired;
		const commandName = options.metadata.name;
		const commandUserExtension = options.commandUserExtension;
		let commandArguments = options.arguments;

		try {
			const beforeExecutingOutput = await commandUserExtension.beforeExecuting({
				commandName: commandName,
				projectFolder: this._executionPath,
				arguments: isSetupRequired ? this._applyDefaultContextParams(commandArguments, projectConfiguration) : commandArguments,
			});
			const overriddenArguments = beforeExecutingOutput.arguments;

			return command.run(overriddenArguments);
		} catch (error) {
			throw error;
		}
	}

	_applyDefaultContextParams(args, projectConfiguration) {
		args.authid = projectConfiguration.defaultAuthId;
		return args;
	}
};
