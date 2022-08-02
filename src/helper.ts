import * as vscode from 'vscode';
const editor = vscode.window.activeTextEditor as vscode.TextEditor;
const doc = editor.document;
const cb = vscode.env.clipboard;
const text = doc.getText();

interface Slice{
  start:vscode.Position,
  stop:vscode.Position,
  text:string
};

export function getTextFromPositions(startPosition:vscode.Position,stopPosition:vscode.Position){
  return {
    start:startPosition,
    stop:stopPosition,
    text:doc.getText(new vscode.Range(startPosition,stopPosition))
  } as Slice;
};

export function getTextFromOffsets(startOffset:number,stopOffset:number){
  let startPosition = doc.positionAt(startOffset);
  let stopPosition = doc.positionAt(stopOffset);
  return getTextFromPositions(startPosition,stopPosition);
};

export function getCurrentWord(){
  let word = doc.getWordRangeAtPosition(editor.selection.active);
  if (word){
    return {
      start:word.start,
      stop:word.end,
      text:doc.getText(new vscode.Range(word.start,word.end))
    } as Slice;
  }else{
    return{
      start:editor.selection.active,
      stop:editor.selection.active,
      text:""
    }as Slice;
  }
};

export function getCurrentLine(){
  let line = doc.lineAt(editor.selection.active.line);
  return{
    start:line.range.start,
    stop:line.range.end,
    text:line.text
  }as Slice;
};

export const clipboard = {
  write : (text:string)=>{return cb.writeText(text);},
  read : ()=>{return cb.readText();}
};

export function getUserInput(title:string="Please provide and input",prompt:string=""){
  return vscode.window.showInputBox({title,prompt});
}

export enum Action{
  cut   = "CUT",
  copy  = "COPY",
  paste = "PASTE"
}
export enum Modifier{
  inside = "INSIDE",
  around = "AROUND",
  till   = "TILL"
}
export enum TextObject{
  word = "WORD",
  line = "LINE"
}

export interface Command{
  action:Action,
  text:Slice
}


export const wrapperBox = new Map<string,{start:string,stop:string}>(
  [
    ["{",{start:"{",stop:"}"}],
    ["}",{start:"{",stop:"}"}],
    ["(",{start:"(",stop:")"}],
    [")",{start:"(",stop:")"}],
    ["[",{start:"[",stop:"]"}],
    ["]",{start:"[",stop:"]"}],
    ["<",{start:"<",stop:">"}],
    [">",{start:"<",stop:">"}],
  ]
);

export const actionBox = new Map<string,Action>(
  [
    ["c",Action.cut],
    ["d",Action.cut],
    ["y",Action.copy],
    ["p",Action.paste],
  ]
);
export const modifierBox = new Map<string,Modifier>(
  [
    ["i",Modifier.inside],
    ["a",Modifier.around],
    ["t",Modifier.till],
  ]
);
export const textObjectBox = new Map<string,TextObject>(
  [
    ["w",TextObject.word],
    ["l",TextObject.line],
  ]
);

export function getStartPosition(startCharacter:string,stopCharacter:string,inclusive:boolean){
  let before = doc.offsetAt(editor.selection.active);
  let res = -1;
  if (startCharacter === stopCharacter || !wrapperBox.get(startCharacter) || !wrapperBox.get(stopCharacter)){
    res = text.lastIndexOf(startCharacter,before);		
  }else{
    let toFind = 1;
    for (let i=before; i>=0; i--){
      if(text[i]===startCharacter){toFind -= 1;}
      else if(text[i]===stopCharacter){toFind += 1;}
      if(toFind === 0){res = i; break;}
    }
  }
  if(res === -1){return editor.selection.active;}
  else{
    if(inclusive){
      res = res - 1;
      res = res<0?0:res;
    }
    return doc.positionAt(res);
  }
}

export function getStopPosition(startCharacter:string,stopCharacter:string,inclusive:boolean){
  let after = doc.offsetAt(editor.selection.active);
  let res = -1;
  if (startCharacter === stopCharacter || !wrapperBox.get(startCharacter) || !wrapperBox.get(stopCharacter)){
    res = text.indexOf(stopCharacter,after);		
  }else{
    let toFind = 1;
    for (let i=after; i<text.length; i++){
      if(text[i]===startCharacter){toFind += 1;}
      else if(text[i]===stopCharacter){toFind -= 1;}
      if(toFind === 0){res = i; break;}
    }
  }
  if(res === -1){return editor.selection.active;}
  else{
    if(inclusive){
      res = res + 1;
      res = res>=text.length?text.length-1:res;
    }
    return doc.positionAt(res);
  }
}


export function parseCommand(command:string){
  command = command.substring(0,3);
  if(command.length >= 3){
    let text:Slice;
    let action = actionBox.get(command.charAt(0));
    let modifier = modifierBox.get(command.charAt(1));
    let textObject = textObjectBox.get(command.charAt(2));
    if(action && modifier && textObject){
      if(textObject === TextObject.line){
        text = getCurrentLine();
      }else if (textObject === TextObject.word){
        text = getCurrentWord();
      }else{
        text = (new Section(command.charAt(2),modifier,textObject)).text;
      }
      return {action,text} as Command;
    }else{
      return;
    }
  }else{
    return;
  }

}

export class Section{
	startCharacter:string="";
	stopCharacter:string="";
	inclusive:Modifier;
  startPosition:vscode.Position = editor.selection.active;
  stopPosition:vscode.Position = editor.selection.active;
  text:Slice;
	
	constructor(boundryCharacter:string,modifier:Modifier,textObject:TextObject){
		this.inclusive = modifier;
		this.populateEdgeCharacters(boundryCharacter);
    this.populateEdgePositions(textObject);
    this.text = getTextFromPositions(this.startPosition,this.stopPosition);
	}
  populateEdgeCharacters(boundryCharacter:string){
    let box = wrapperBox.get(boundryCharacter);
    if(box){
      this.startCharacter,this.stopCharacter = box.start,box.stop;
    }else{
      this.startCharacter,this.stopCharacter = boundryCharacter,boundryCharacter;
    }
  }
  populateEdgePositions(textObject:TextObject){
    if(textObject === TextObject.line){
      let line = getCurrentLine();
      this.startPosition,this.stopPosition = line.start,line.stop;
    }
    else if(textObject === TextObject.word){
      let word = getCurrentWord();
      this.startPosition,this.stopPosition = word.start,word.stop;
    }
    else{
      this.startPosition = getStartPosition(this.startCharacter,this.startCharacter,this.inclusive === Modifier.around);
      this.stopPosition = getStopPosition(this.startCharacter,this.startCharacter,this.inclusive === Modifier.around);
    }
  }
}

export async function performCopyAction(text:Slice){
  editor.selection = new vscode.Selection(text.start,text.stop);
  await clipboard.write(text.text);
}
export async function performCutAction(text:Slice){
  editor.selection = new vscode.Selection(text.start,text.stop);
  editor.edit(editBuilder=>{
    editBuilder.replace(editor.selection,"");
  });
  await clipboard.write(text.text);
}
export async function performPasteAction(text:Slice){
  editor.selection = new vscode.Selection(text.start,text.stop);
  let toPaste = await clipboard.read();
  editor.edit(editBuilder=>{
    editBuilder.replace(editor.selection,toPaste);
  });
}