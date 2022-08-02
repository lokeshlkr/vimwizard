# Overview

"VimWizard" is a VSCode extension, that can perform some very basic VIM commands in VIM syntax.

When you run the command vimwizard.vimOperations:
1. A input box appears where you can type vim commands like : 
  1. yi) 
  2. di{
2. Once you press enter the VimWizard will try to understand the functionality and perform it.

# Deviations

As VSCode is not modal editor so it would not make sense to have separate DELETE and CHANGE functionality.
So for YANK it will highlight the appropriate and section (for visual feedback) and copy to clipboard.
For CHANGE/DELETE it will copy appropriate section to clipboard and delete the section.