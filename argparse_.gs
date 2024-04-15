/**
 *  ArgParse
 * 
 *    Parse out commands and functions
 */
class ArgParse extends Listener {
  constructor() {
    super();
    this._commands = [];
    this._default_flags = ['--help', '-h', '?'];
    this.CMD = new CommandFunctions;
  }

  /**
   *  addCommand
   * 
   *    Add a command with associated options to the parser.
   * 
   * @Param: {String} command - The command name.
   * @Param: {Array} options - Array of Argument objects representing options.
   */
  addCommand(command, options) {
    try {
      this._commands.push({command, options});
    } catch (e) {
      this.Logs(e.stack, `ARG_Lexer:addCommand`);
      Logger.log(`Whoopsies! Error in addCommand: ${e.stack}`)
    }
  }

  /**
   *  _parse
   * 
   *   Parse the input string and return an object with parsed arguments and options.
   * 
   * @Param: {String} input_String - The input string to parse.
   * @Return: {Object} parsed_args - Parsed arguments and options.
   */
  _parse(input_String) {
    this.stdout.setValue(['Parsing commands...']);
    var args = input_String.trim().split(/\s+/);

    // [////////////////////]
    // Lexer for strings passed in double quotes: "Hello, World!"
    const start_token = args.findIndex(str => str.startsWith('"'));
    const last_token = (args.length) - args.toReversed().findIndex(str => str.endsWith('"'));
    const count = (input_String.match(/"/g) || []).length

    // If the argument contains an odd number of double quotes, then it skips.
    if (count % 2 == 0){
      const compiled = args.slice(start_token, last_token).join(' ');

      args = [
        ...args.slice(0, start_token),
        compiled,
        ...args.slice(last_token)
      ];
    }
    // [////////////////////]

    const parsed_args = {};
    const command_name = args[0];
    // Quick n dirty
    if (command_name == 'help') {
      let help_command = this._commands.filter(command => command.command == 'help')
      this.stdout.setValue([help_command[0].options.help])
      return null;
    };

    /**
     *  map_flag_values
     * 
     *    map the flags with the next value in the array.
     */
    const map_flag_values = (command_flags) => {
      command_flags.forEach(flag => {
        let flag_pos = args.indexOf(flag);
        // Logger.log(`flag: ${flag} : ${flag_pos}\n${args}`)
        flag = flag.replace(/^-+/, '');

        // If the flag is in the user defined flags then map the flag to the next value if the value mapped is not a flag.
        if (flag_pos != -1) parsed_args[flag] = command_flags.includes(args[flag_pos + 1]) ? null 
          : args[flag_pos + 1] == (null || undefined) ? null : args[flag_pos + 1];
      })
    }

    // Parse command flags, options.
    this._commands.forEach(unparsed_command => {
      // Command is first word.
      const command_regex = new RegExp(`^${unparsed_command.command}$`);
      const command_position = command_name.match(command_regex) || null;

      // if command is found/valid.
      if (Boolean(command_position)) {
        let has_options = unparsed_command.hasOwnProperty("options") && unparsed_command.options !== (null || undefined);
        Logger.log(`args: ${args}\n${JSON.stringify(unparsed_command, null, 1)}\nHas options property: ${unparsed_command.hasOwnProperty('options')}\n${unparsed_command.options}\nHas options boolean: ${has_options}`)

        // If there's flags and options set for the command then parse out options.
        if (has_options) {
          // Map all flags to the nth + 1 value
          map_flag_values(unparsed_command.options.flags);
          map_flag_values(this._default_flags);

          // If the input has the `--help` flag then add the command's help.
          if (Boolean(Object.keys(parsed_args).includes('help'))) parsed_args.help = unparsed_command.options.help;

          // If the command has no flags, it executes without flags.
          if (unparsed_command.options.flags.length == 0) {
            parsed_args['no_flag_command'] = true
          } else if (Object.keys(parsed_args).length == 0 && unparsed_command.options.flags.length > 0) {
            parsed_args['needs_flag_command'] = true;
          }
        }
      }
    });
    // Logger.log(parsed_args.hasOwnProperty('no_flag_command'))
    // Logger.log(parsed_args.hasOwnProperty('needs_flag_command'))
    // Logger.log(Object.keys(parsed_args))

    // If the command doesn't need flags, or if the command needs flags throw error.
    if (Object.keys(parsed_args) - 2 == 0 && !parsed_args.hasOwnProperty('no_flag_command') && !parsed_args.hasOwnProperty('needs_flag_command')) {
      Logger.log(`len: ${Object.keys(parsed_args).length}\n${Object.keys(parsed_args)}\n${parsed_args.hasOwnProperty('needs_flag_command')}`)
      if (parsed_args.hasOwnProperty('needs_flag_command')) {
        this.stdout.setValue([`Command \`${command_name}' has no flags specified, see \`${command_name} --help'`])
      } else {
        this.stdout.setValue([`Command \`${command_name}' not found.`])
      }
      return null;
    }

    parsed_args['command'] = command_name;

    return parsed_args;
  }

  /**
   *  _execute
   * 
   *    Execute command and arguments
   * 
   * @Param: {Object} command_args - Object output from _parse
   */
  _execute(command_args) {
    const command = command_args.command;
    const flags = Object.keys(command_args).filter(flags => flags != 'command')

    // If the `help' flag is present, then show the help menu for the command.
    const display_help = flags.some(flag => this._default_flags.map(help_flags => help_flags.replace(/^-+/, '')).includes(flag))
    if (display_help) {
      this.stdout.setValue([command_args.help])
      return null;
    }

    // If the command is valid but there's no function yet.
    if (command in this.CMD == (null || undefined || false)) {
      Logger.log(`Command \`${command}' is valid, though no function exists. Check your input or see \`help' for a list of commands.`)
      this.stdout.setValue([`Command \`${command}' is valid, though no function exists. Check your input or see \`help' for a list of commands.`]);
      return null;
    }

    // Execute command.
    this.CMD[command](command_args);
  }
}

class CommandFunctions extends Listener {
  constructor() {
    super();
    this.time = Date.now()
  }

  /**
   *  ping
   *
   *    Pong!
   */
  ping(_) {
    try{
      const time = parseInt(Date.now());
      this.stdout.setValue([`Pong! With a time of: ${(parseInt(time) - parseInt(this.time)) / 1000}ms`])
    } catch (e) {
      this.Logs(e.stack, 'ProgCommands:_ping')
      Logger.log(`Whoopsies! Error in _ping: ${e.stack}`)
    }
  }

  /**
   *  whoami
   * 
   *    Get the authoritative user running the script.
   */
  whoami(_) {
    try{
      this.stdout.setValue([String(this.effective_user)])
    } catch (e) {
      this.Logs(e.stack, 'CommandFunctions:whoami');
      Logger.log(`Whoopsies! Error in whoami: ${e.stack}`);
    }
  }

  /**
   *  checkdir
   * 
   *    Check a directory for files
   */
  checkdir(command_args) {
    Logger.log(JSON.stringify(command_args, null, 2))
    try {
      const folder_id_regex = /\/folders\/([a-zA-Z0-9_-]+)/;
      const args_got = command_args;
      var link = 'file';

      // Set link option
      if (args_got['get-link'] && args_got['get-link'].match(/(file)|(dl)/)) {
        link = args_got['get-link'];
      }

      // if no folder is specified
      if (!args_got.folder) {
        this.stdout.setValue(["Unknown folder: ", args_got.folder]);
        return;
      }

      // Grab folder hash
      const folder_id_link_match = args_got.folder.match(folder_id_regex);
      const hash_id_match = args_got.folder.match(/[a-zA-Z0-9_-]+/);

      if ((!folder_id_link_match || folder_id_link_match.length < 2) && !hash_id_match) {
        Logger.log("No folder ID found in the provided link.");
        this.stdout.setValue(["No folder ID found in the provided link."])
        return;
      }

      let folder_id = folder_id_link_match ? folder_id_link_match[1] : hash_id_match;
      var folder = DriveApp.getFolderById(folder_id);

      // If the parent flag is set, traverse to parent folder.
      if (Object.keys(args_got).includes('parent')) {
        while (folder.getParents().hasNext()) {
          folder = folder.getParents().next();
        }

        folder = DriveApp.getFolderById(folder.getId());
        Logger.log(`Got Parent: ${folder.getName()}\t:\t${folder.getId()}`)
      }

      // If the folder id is invalid or unable to get.
      if (!folder) {
        Logger.log(`Folder with ID ${folder_id} not found.`);
        this.stdout.setValue([`Folder with ID: ${folder_id} not found`]);
        return;
      }

      // [//////////////////////////////]
      var directory_tree = [];
      let extension_regex;

      // Define file extentions
      var file_extensions = args_got.ext ? args_got.ext : null;
      if (file_extensions == null) file_extensions = args_got.MIME ? args_got.MIME : null;

      // If there is a file extension defined
      if (file_extensions) {
        const extensions_Array = file_extensions.split(',').map(ext => ext.toLowerCase().trim());
        const extensions_Escaped = extensions_Array.map(ext => ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        extension_regex = new RegExp(extensions_Escaped.join('|'));
      // Otherwise get all files.
      } else extension_regex = /\.\w*$/;

      // Get files in the folder
      const folder_files = folder.getFiles();
      const folder_folders = folder.getFolders();

      /**
       *  get_from_directory
       * 
       *    Function to get all files and folder links, id, and content.
       * 
       */
      const get_from_directory = (iterator, get_type = 'file', operation = '') => {
        let buffer = [];
        while (iterator.hasNext()) {

          const current_F = iterator.next();
          const current_FName = current_F.getName();
          const current_FID = current_F.getId();
          var mime_type = current_F.hasOwnProperty('getMimeType') ? current_F.getMimeType() : null;
          // Logger.log(`FNAME: ${current_FName} : ${current_FID}\n${current_F.hasOwnProperty('getMimeType')}`)

          // If the type is a folder then get the url, because there is no download url for folders.
          var current_FURL = link == 'dl' && get_type != 'folder' ? current_F.getDownloadUrl() : current_F.getUrl();

          let tree = {
            name: current_FName,
            id: current_FID,
            url: current_FURL,
            type: get_type
          };

          if (operation == 'subdirectory') {
            if (mime_type == null) mime_type = DriveApp.getFileById(tree.id).getMimeType();
            get_type = mime_type.match(/(google-apps\.folder)|(google-apps\.shortcut)/) ? 'folder' : 'file';
            tree.type = get_type;

            // Logger.log(`NAME: ${current_FName} : ${current_FID}\nMIME: ${mime_type}\nTYPE: ${get_type}`)
          }

          if (get_type == 'file' && (current_FName.match(extension_regex) || mime_type.match(extension_regex))) {
            buffer.push(tree);
          } else if (get_type == 'folder') {
            let folder = current_F.getFiles();
            let folder_token = folder.getContinuationToken();
            let empty_folder = folder.hasNext();

            // Logger.log(`MT: ${empty_folder}\nTREE: ${JSON.stringify(tree, null, 2)}\nMIME: ${mime_type}`)

            tree['token'] = folder_token;
            tree['content'] = [];

            // if it's an empty folder then skip, otherwise add it.
            if (operation == 'subdirectory' && empty_folder == false) { 
              empty_folder = true;
            }
            empty_folder ? buffer.push(tree) : null;
          }
        }
        return buffer;
      }

      // Iterate through parent folder content
      var folder_contents = get_from_directory(folder_folders, 'folder')
      var file_contents = get_from_directory(folder_files)

      // Logger.log(get_from_directory(DriveApp.continueFileIterator(folder_files_token)))

      // Push parent folder
      directory_tree.push({
        type: 'parent',
        name: `${folder.getName()}:${folder.getId()}`,
        content: [
          folder_contents.length > 0 ? { type: 'folder', content: folder_contents.sort() } : null,
          file_contents.length   > 0 ? { type: 'file',   content: file_contents.sort()   } : null
        ].filter(nulls => nulls != null)
      })

      var display = 'Append folder hash to this url to peek inside:\nhttps://drive.google.com/drive/folders/\n\nDirectory tree:\n';
      // Logger.log(JSON.stringify(directory_tree, null, 2))

      // https://tree.nathanfriend.io/
      directory_tree.forEach(directory => {
        // Parent Directory name formatting
        display += `.\n└── ${directory.name}`;

        // Iterate through 'folder' and 'file'
        directory.content.forEach((subdirectory, index) => {

          // Add each subdirectory or files to the map.
          subdirectory.content.forEach((subdirectory_contents, subdirectory_contents_index) => {
            let is_last_content = directory.content.length - 1 == index && subdirectory.content.length - 1 == subdirectory_contents_index;
            let format = `\n    ${is_last_content ? '└──' : '├──'} `;

            let name_emoji = subdirectory.type == 'folder' ? '/ 📁' : ' 📄';
            let url = subdirectory.type == 'folder' ? subdirectory_contents.id : subdirectory_contents.url;

            // Add it to display
            display += `${format}${subdirectory_contents.name}${name_emoji}:${url}`;

            // Return subdirectory files
            if (subdirectory.type == 'folder') {
              // Logger.log(`GOING IN: ${subdirectory_contents.name}`)
              let file_iterator = DriveApp.continueFolderIterator(subdirectory_contents.token);
              let subfiles = get_from_directory(file_iterator, 'folder', 'subdirectory');

              if (subfiles.length > 0) {
                subfiles.forEach((file, subfiles_index) => {
                  let is_folder_or_file = file.type == 'folder' ? '/ 📁' : ' 📄';
                  let url = file.type == 'folder' ? file.id : file.url;
                  let subdirectory_files_format = `\n    │    ${subfiles.length - 1 == subfiles_index ? '└──' : '├──'} `;

                  // Add subdirectory files & folders
                  display += `${subdirectory_files_format}${file.name}${is_folder_or_file}:${url}`;
                })
                // Logger.log(JSON.stringify(subfiles, null, 2))
              }
            }
          })
        })
      })
      Logger.log(display)

      let this_day = Date.now()
      let create_file = DriveApp.createFile(`checkdir:${this_day}.txt`, display);

      this.stdout.setValue([`=HYPERLINK("${create_file.getUrl()}", "Created file ${create_file.getName()}")`])
    } catch (e) {
      this.Logs(e.stack, 'ProgCommands:_checkdir');
      Logger.log(`Whoopsies! Error in _checkdir: ${e.stack}`);
      return [];
    }
  }
}

class Arguments {
  constructor({ flags = [], help = ''} = {}) {
    // Add longhand property if it doesn't exist.
    this.flags = flags.map(flag => { return !flag.match(/^-+/) ? `--${flag}` : flag });
    this.help = help || 'No help available for command.'
  }
}

// https://man7.org/linux/man-pages/man3/getopt.3.html
// https://github.com/bfgroup/Lyra/tree/develop
// https://github.com/gcc-mirror/gcc/blob/master/libiberty/getopt.c
function testLexer () {
  const arg = new ArgParse;

  arg.addCommand('help',
    new Arguments({help: `These shell commands are defined internally are are not case sensitive.

        help        Display this help menu and exit
        ping        Recieve a pong!
        whoami      Returns the user running the script.
        checkdir    Get all contents in a specified directory.
        crypt       Encrypt or decrypt a string.

Type \`<command> --help' to display more information about that command:
         ping --help
         checkdir --help`})
  )

  arg.addCommand('ping',
    new Arguments({help: 'Usage: ping\nReceive a pong! Check the delay, and response to server.'})
  )

  arg.addCommand('whoami',
    new Arguments({help: 'Usage: whoami\nReturn the user running the script.'})
  )

  arg.addCommand('checkdir',
    new Arguments({ flags: ['folder', 'max-depth', 'link', 'ext', 'parent', 'MIME'], help: 'Usage: checkdir [...OPTIONS]\nGet all contents in a specified directory.\n\nOptions:\n\t ext\t Specify file extensions to look for (mp4,mp3,pdf)\n\t MIME\t Specify file MIME types to look for (audio, video, text, model, image, font, application)\n\t max-depth\t print the total for a directory (or file) only if it is N or fewer levels below the command line argument.\n\t link\t Get the links to each file in the folder. Options: (dl, file). (default: file)\n\t folder\t Specify the folder to run the check on.\n\t parent\t Start the scan from the parent folder.\n\nexample usage:\n   checkdir --max-depth 1 --folder https://drive.google.com/drive/folders/11jWW8TV0dWD1wGChpucKLCXS-BuwikZ0?usp=drive_link --ext txt,mp4\n   checkdir --folder 11jWW8TV0dWD1wGChpucKLCXS-BuwikZ0 --MIME audio,text' })
  )

  arg.addCommand('crypt',
    new Arguments({ flags: ['algo', 'encrypt', 'decrypt', 'key'], help: `Usage: crypt [...OPTIONS]\nEncrypt a string or file with a specified algorithm.\n\nOptions:\n\t algo\t Specify an algorithm to use. (AES)\n\t encrypt\t Encrypt the String or File.\n\t decrypt\t Decrypt the String or File.\n\t key\t The passphrase used to encrypt or decrypt.`})
  )

  // const inputString = 'ping --url --host 127.0.0.1';
  // const inputString = 'crypt --algo aes --encrypt "Hello, World!" --key P455W0RD123';
  const inputString = "checkdir --folder 1L21GiYc2l2zOEY2RWQi2EtY-jfISwGZ8 --parent --MIME audio";
  // const inputString = "checkdir --folder https://drive.google.com/drive/folders/11jWW8TV0dWD1wGChpucKLCXS-BuwikZ0?usp=drive_link --ext .txt,.pdf";
  // const inputString = "checkdir --folder https://drive.google.com/drive/folders/11jWW8TV0dWD1wGChpucKLCXS-BuwikZ0?usp=drive_link --parent --MIME audio";
  // const inputString = "checkdir";
  // const inputString = 'whoami';


  const parsed_args = arg._parse(inputString);
  // Logger.log(JSON.stringify(parsed_args, null, 2));
  parsed_args != null ? arg._execute(parsed_args) : [];
}
