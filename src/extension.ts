import * as vscode from 'vscode';
import * as helper from "./helper";

const editor = vscode.window.activeTextEditor as vscode.TextEditor;
const doc = editor.document;
const cursor = editor.selection.active;

export function activate(context: vscode.ExtensionContext) {

	let vimOperations = vscode.commands.registerCommand('vimwizard.vimOperations', async () => {
		let userInput = await helper.getUserInput();
		if (!userInput){vscode.window.showErrorMessage("Operation Cancelled!");return;}
		else{
			let command = helper.parseCommand(userInput);
			if(command){
				if (command.action === helper.Action.copy){helper.performCopyAction(command.text);}
				else if (command.action === helper.Action.cut){helper.performCutAction(command.text);}
				else if (command.action === helper.Action.paste){helper.performPasteAction(command.text);}
				else{
					vscode.window.showErrorMessage("Could not understand the command!");
				}				
			}
		}
	});

	
	context.subscriptions.push(vimOperations);
}

export function deactivate() {}
