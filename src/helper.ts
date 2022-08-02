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
    return doc.positionAt(res+1);
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
  if(command.length >= 3){
    let text:Slice = getCurrentWord();
    let action = actionBox.get(command.charAt(0));
    let modifier = command.charAt(1);
    let textObject = command.charAt(2);
    if(action){
      if(textObject === 'l'){
        text = getCurrentLine();
      }else if (textObject === 'w'){
        text = getCurrentWord();
      }else{
        text = (new Section(command.charAt(2),modifier)).text;
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
	modifier:string="";
  startPosition:vscode.Position = editor.selection.active;
  stopPosition:vscode.Position = editor.selection.active;
  text:Slice;
	
	constructor(textObject:string,modifier:string){
		this.modifier = modifier;
		this.populateEdgeCharacters(textObject);
    this.populateEdgePositions(textObject);
    this.text = getTextFromPositions(this.startPosition,this.stopPosition);
	}
  populateEdgeCharacters(textObject:string){
    let box = wrapperBox.get(textObject);
    if(box){
      this.startCharacter = box.start;
      this.stopCharacter = box.stop;
    }else{
      this.startCharacter = textObject;
      this.stopCharacter = textObject;
    }
  }
  populateEdgePositions(textObject:string){
    if(this.modifier === 't'){
      if(textObject === 'l'){
        let line = getCurrentLine();
        this.startPosition= editor.selection.active;
        this.stopPosition = line.stop;
      }
      else if(textObject === 'w'){
        let word = getCurrentWord();
        this.startPosition= editor.selection.active;
        this.stopPosition = word.stop;
      }
      else{
        this.startPosition = editor.selection.active;
        this.stopPosition = getStopPosition(this.startCharacter,this.startCharacter,false);
      }
    }
    else if(this.modifier === 'f'){
      if(textObject === 'l'){
        let line = getCurrentLine();
        this.startPosition= line.start;
        this.stopPosition = editor.selection.active;
      }
      else if(textObject === 'w'){
        let word = getCurrentWord();
        this.startPosition= word.start;
        this.stopPosition = editor.selection.active;
      }
      else{
        this.startPosition = getStartPosition(this.startCharacter,this.stopCharacter,false);
        this.stopPosition = editor.selection.active;
      }
    }
    else if (this.modifier === 'a' || this.modifier === 'i'){
      if(textObject === 'l'){
        let line = getCurrentLine();
        this.startPosition = line.start;
        this.stopPosition = line.stop;
      }
      else if(textObject === 'w'){
        let word = getCurrentWord();
        this.startPosition = word.start;
        this.stopPosition = word.stop;
      }
      else{
        this.startPosition = getStartPosition(this.startCharacter,this.stopCharacter,this.modifier === 'a');
        this.stopPosition = getStopPosition(this.startCharacter,this.stopCharacter,this.modifier === 'a');
      }
    }else{
      this.startPosition = editor.selection.active;
      this.stopPosition = editor.selection.active;
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