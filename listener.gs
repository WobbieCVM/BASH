class Listener {
  constructor (){
    this.sheet = SpreadsheetApp.openById('19Xm4MPIXjAPFH1ysFFqtdxLbBghEK8rOu0dX9X1R3eI');

    this.spreadsheetCLI = this.sheet.getSheetByName('CLI');
    this.spreadsheetLOGS = this.sheet.getSheetByName('LOGS');

    this.cli = this.spreadsheetCLI.getRange('A2');
    this.stdout = this.spreadsheetCLI.getRange('A3');

    this.active_user = Session.getActiveUser();
    this.effective_user = Session.getEffectiveUser();
  }

  /**
   *  Logger
   *
   *    Writes Logs to Spreadsheet page for easyaccess
   *
   * @Param: {String, String}
   * @CalledBy: {try...catch}
   */
  Logs(message, func) {
    const timestamp_unix = new Date().toString().split('GMT')[0];

    // Inserts a row before the first
    this.spreadsheetLOGS.insertRowBefore(2);
    const valuesToSet = [[`${Date.now()}:${timestamp_unix}`, func, message]];
    const range = this.spreadsheetLOGS.getRange(2, 1, 1, valuesToSet[0].length);

    range.setValues(valuesToSet);
  };
}

/**
 *  C2C
 * 
 *    Handles commands passed in spreadsheet
 * 
 * 
 * @CalledBy: {Installable Trigger} onEdit
 * @Param: {Object} e
 */
function C2 (e){
  const listener = new Listener;
  const cli = listener.cli;

  try{
    const motd = listener.spreadsheetCLI.getRange('A1');
    const motdHelp = `01000010100000010100101001000\n\t\t\t\t\t\t   v1.1`;
    if (motd.getValue() != motdHelp){
      motd.setValue([motdHelp]);
    }

    // case of random things.
    if (e == (null || undefined)) return;

    // const authHelper = new AuthorizationHelper();
    const argparse = new ArgParse;
    const time = Date.now();
    const current_user = listener.active_user;

    if (current_user != 'robert.yamashita@missionary.org'){
      cli.setValue(['You are not authorized to use commands.']);
      return;
    };

    const sheetName = e.source.getSheetName();
    if (String(sheetName) != 'CLI' || e.value == (undefined || null)){
      return;
    };

    // Define commands.
    argparse.addCommand('help',
      new Arguments({help: `These shell commands are defined internally are are not case sensitive.

          help        Display this help menu and exit
          ping        Recieve a pong!
          whoami      Returns the user running the script.
          tree        Get all contents in a specified directory.
          crypt       Encrypt or decrypt a string.

  Type \`<command> --help' to display more information about that command:
          ping --help
          tree --help`})
    )

    argparse.addCommand('ping',
      new Arguments({help: 'Usage: ping\nReceive a pong! Check the delay, and response to server.'})
    )

    argparse.addCommand('whoami',
      new Arguments({help: 'Usage: whoami\nReturn the user running the script.'})
    )

    argparse.addCommand('tree',
      new Arguments({ flags: ['folder', 'max-depth', 'link', 'ext', 'parent', 'MIME'], help: 'Usage: tree [...OPTIONS]\nGet all contents in a specified directory.\n\nOptions:\n\t ext\t Specify file extensions to look for (mp4,mp3,pdf)\n\t MIME\t Specify file MIME types to look for (audio, video, text, model, image, font, application)\n\t max-depth\t print the total for a directory (or file) only if it is N or fewer levels below the command line argument.\n\t link\t Get the links to each file in the folder. Options: (dl, file). (default: file)\n\t folder\t Specify the folder to run the check on.\n\t parent\t Start the scan from the parent folder.\n\nexample usage:\n   tree --max-depth 1 --folder https://drive.google.com/drive/folders/11jWW8TV0dWD1wGChpucKLCXS-BuwikZ0?usp=drive_link --ext txt,mp4\n   tree --folder 11jWW8TV0dWD1wGChpucKLCXS-BuwikZ0 --MIME audio,text' })
    )

    const parsed_args = argparse._parse(String(e.value));
    parsed_args != null ? argparse._execute(parsed_args) : [];
    return;

    // Get commands
    const parsedValues = argparse.parse(String(e.value));
    const command = new ProgCommands(parsedValues, time);
    command.execute();
  } catch (e) {
    listener.Logs(e.stack, 'C2')
    Logger.log(`Whoopsies! Error in C2: ${e.stack}`)
  }
}
