"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performPasteAction = exports.performCutAction = exports.performCopyAction = exports.Section = exports.parseCommand = exports.getStopPosition = exports.getStartPosition = exports.textObjectBox = exports.modifierBox = exports.actionBox = exports.wrapperBox = exports.TextObject = exports.Modifier = exports.Action = exports.getUserInput = exports.clipboard = exports.getCurrentLine = exports.getCurrentWord = exports.getTextFromOffsets = exports.getTextFromPositions = void 0;
const vscode = require("vscode");
const editor = vscode.window.activeTextEditor;
const doc = editor.document;
const cb = vscode.env.clipboard;
const text = doc.getText();
;
function getTextFromPositions(startPosition, stopPosition) {
    return {
        start: startPosition,
        stop: stopPosition,
        text: doc.getText(new vscode.Range(startPosition, stopPosition))
    };
}
exports.getTextFromPositions = getTextFromPositions;
;
function getTextFromOffsets(startOffset, stopOffset) {
    let startPosition = doc.positionAt(startOffset);
    let stopPosition = doc.positionAt(stopOffset);
    return getTextFromPositions(startPosition, stopPosition);
}
exports.getTextFromOffsets = getTextFromOffsets;
;
function getCurrentWord() {
    let word = doc.getWordRangeAtPosition(editor.selection.active);
    if (word) {
        return {
            start: word.start,
            stop: word.end,
            text: doc.getText(new vscode.Range(word.start, word.end))
        };
    }
    else {
        return {
            start: editor.selection.active,
            stop: editor.selection.active,
            text: ""
        };
    }
}
exports.getCurrentWord = getCurrentWord;
;
function getCurrentLine() {
    let line = doc.lineAt(editor.selection.active.line);
    return {
        start: line.range.start,
        stop: line.range.end,
        text: line.text
    };
}
exports.getCurrentLine = getCurrentLine;
;
exports.clipboard = {
    write: (text) => { return cb.writeText(text); },
    read: () => { return cb.readText(); }
};
function getUserInput(title = "Please provide and input", prompt = "") {
    return vscode.window.showInputBox({ title, prompt });
}
exports.getUserInput = getUserInput;
var Action;
(function (Action) {
    Action["cut"] = "CUT";
    Action["copy"] = "COPY";
    Action["paste"] = "PASTE";
})(Action = exports.Action || (exports.Action = {}));
var Modifier;
(function (Modifier) {
    Modifier["inside"] = "INSIDE";
    Modifier["around"] = "AROUND";
    Modifier["till"] = "TILL";
})(Modifier = exports.Modifier || (exports.Modifier = {}));
var TextObject;
(function (TextObject) {
    TextObject["word"] = "WORD";
    TextObject["line"] = "LINE";
})(TextObject = exports.TextObject || (exports.TextObject = {}));
exports.wrapperBox = new Map([
    ["{", { start: "{", stop: "}" }],
    ["}", { start: "{", stop: "}" }],
    ["(", { start: "(", stop: ")" }],
    [")", { start: "(", stop: ")" }],
    ["[", { start: "[", stop: "]" }],
    ["]", { start: "[", stop: "]" }],
    ["<", { start: "<", stop: ">" }],
    [">", { start: "<", stop: ">" }],
]);
exports.actionBox = new Map([
    ["c", Action.cut],
    ["d", Action.cut],
    ["y", Action.copy],
    ["p", Action.paste],
]);
exports.modifierBox = new Map([
    ["i", Modifier.inside],
    ["a", Modifier.around],
    ["t", Modifier.till],
]);
exports.textObjectBox = new Map([
    ["w", TextObject.word],
    ["l", TextObject.line],
]);
function getStartPosition(startCharacter, stopCharacter, inclusive) {
    let before = doc.offsetAt(editor.selection.active);
    let res = -1;
    if (startCharacter === stopCharacter || !exports.wrapperBox.get(startCharacter) || !exports.wrapperBox.get(stopCharacter)) {
        res = text.lastIndexOf(startCharacter, before);
    }
    else {
        let toFind = 1;
        for (let i = before; i >= 0; i--) {
            if (text[i] === startCharacter) {
                toFind -= 1;
            }
            else if (text[i] === stopCharacter) {
                toFind += 1;
            }
            if (toFind === 0) {
                res = i;
                break;
            }
        }
    }
    if (res === -1) {
        return editor.selection.active;
    }
    else {
        if (inclusive) {
            res = res - 1;
            res = res < 0 ? 0 : res;
        }
        return doc.positionAt(res);
    }
}
exports.getStartPosition = getStartPosition;
function getStopPosition(startCharacter, stopCharacter, inclusive) {
    let after = doc.offsetAt(editor.selection.active);
    let res = -1;
    if (startCharacter === stopCharacter || !exports.wrapperBox.get(startCharacter) || !exports.wrapperBox.get(stopCharacter)) {
        res = text.indexOf(stopCharacter, after);
    }
    else {
        let toFind = 1;
        for (let i = after; i < text.length; i++) {
            if (text[i] === startCharacter) {
                toFind += 1;
            }
            else if (text[i] === stopCharacter) {
                toFind -= 1;
            }
            if (toFind === 0) {
                res = i;
                break;
            }
        }
    }
    if (res === -1) {
        return editor.selection.active;
    }
    else {
        if (inclusive) {
            res = res + 1;
            res = res >= text.length ? text.length - 1 : res;
        }
        return doc.positionAt(res);
    }
}
exports.getStopPosition = getStopPosition;
function parseCommand(command) {
    command = command.substring(0, 3);
    if (command.length >= 3) {
        let text;
        let action = exports.actionBox.get(command.charAt(0));
        let modifier = exports.modifierBox.get(command.charAt(1));
        let textObject = exports.textObjectBox.get(command.charAt(2));
        if (action && modifier && textObject) {
            if (textObject === TextObject.line) {
                text = getCurrentLine();
            }
            else if (textObject === TextObject.word) {
                text = getCurrentWord();
            }
            else {
                text = (new Section(command.charAt(2), modifier, textObject)).text;
            }
            return { action, text };
        }
        else {
            return;
        }
    }
    else {
        return;
    }
}
exports.parseCommand = parseCommand;
class Section {
    constructor(boundryCharacter, modifier, textObject) {
        this.startCharacter = "";
        this.stopCharacter = "";
        this.startPosition = editor.selection.active;
        this.stopPosition = editor.selection.active;
        this.inclusive = modifier;
        this.populateEdgeCharacters(boundryCharacter);
        this.populateEdgePositions(textObject);
        this.text = getTextFromPositions(this.startPosition, this.stopPosition);
    }
    populateEdgeCharacters(boundryCharacter) {
        let box = exports.wrapperBox.get(boundryCharacter);
        if (box) {
            this.startCharacter, this.stopCharacter = box.start, box.stop;
        }
        else {
            this.startCharacter, this.stopCharacter = boundryCharacter, boundryCharacter;
        }
    }
    populateEdgePositions(textObject) {
        if (textObject === TextObject.line) {
            let line = getCurrentLine();
            this.startPosition, this.stopPosition = line.start, line.stop;
        }
        else if (textObject === TextObject.word) {
            let word = getCurrentWord();
            this.startPosition, this.stopPosition = word.start, word.stop;
        }
        else {
            this.startPosition = getStartPosition(this.startCharacter, this.startCharacter, this.inclusive === Modifier.around);
            this.stopPosition = getStopPosition(this.startCharacter, this.startCharacter, this.inclusive === Modifier.around);
        }
    }
}
exports.Section = Section;
async function performCopyAction(text) {
    editor.selection = new vscode.Selection(text.start, text.stop);
    await exports.clipboard.write(text.text);
}
exports.performCopyAction = performCopyAction;
async function performCutAction(text) {
    editor.selection = new vscode.Selection(text.start, text.stop);
    editor.edit(editBuilder => {
        editBuilder.replace(editor.selection, "");
    });
    await exports.clipboard.write(text.text);
}
exports.performCutAction = performCutAction;
async function performPasteAction(text) {
    editor.selection = new vscode.Selection(text.start, text.stop);
    let toPaste = await exports.clipboard.read();
    editor.edit(editBuilder => {
        editBuilder.replace(editor.selection, toPaste);
    });
}
exports.performPasteAction = performPasteAction;
//# sourceMappingURL=helper.js.map