"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const helper = require("./helper");
const editor = vscode.window.activeTextEditor;
const doc = editor.document;
const cursor = editor.selection.active;
function activate(context) {
    let vimOperations = vscode.commands.registerCommand('vimwizard.vimOperations', async () => {
        let userInput = await helper.getUserInput();
        if (!userInput) {
            vscode.window.showErrorMessage("Operation Cancelled!");
            return;
        }
        else {
            let command = helper.parseCommand(userInput);
            if (command) {
                if (command.action === helper.Action.copy) {
                    helper.performCopyAction(command.text);
                }
                else if (command.action === helper.Action.cut) {
                    helper.performCutAction(command.text);
                }
                else if (command.action === helper.Action.paste) {
                    helper.performPasteAction(command.text);
                }
                else {
                    vscode.window.showErrorMessage("Could not understand the command!");
                }
            }
        }
    });
    context.subscriptions.push(vimOperations);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map