/**
 * ArgumentParser
 * 
 *  Parses command-line arguments and options.
 * 
 * @Return: {Object} parsedArgs - Parsed arguments and options.
 */
class ArgParse extends Listener {
  constructor() {
    super();
    this._commands = [];
  }

  /**
   * Add a command with associated options to the parser.
   * 
   * @Param: {String} command - The command name.
   * @Param: {Array} options - Array of Argument objects representing options.
   */
  addCommand(command, options) {
    try{
      this._commands.push({ command, options });
    } catch (e) {
      this.Logs(e.stack, 'ArgParse:addCommand')
      Logger.log(`Whoopsies! Error in addCommand: ${e.stack}`)
    }
  }

  /**
   * Parse the input string and return an object with parsed arguments and options.
   * 
   * @Param: {String} inputString - The input string to parse.
   * @Return: {Object} parsedArgs - Parsed arguments and options.
   */
  parse(inputString) {
    try{
      this.stdout.setValue(['Parsing commands...']);
      const args = inputString.trim().split(/\s+/);
      const parsedArgs = {};

      for (const { command, options } of this._commands) {
        const index = args.indexOf(command);

        if (index !== -1) {
          parsedArgs.command = command;
          parsedArgs.options = {};

          let currentOpt = null;

          for (let i = 0; i < options.length; i++) {
            const option = options[i];
            const arg = args[index + i + 1];

            if (arg && arg.startsWith('-')) {
              // Handle -h as a special case for help
              if (arg === '-h' || arg === '--help') {
                parsedArgs.options.help = true;
                continue;
              }

              currentOpt = arg.replace(/^-+/, '');

              // Handle specific options for the sendmail command before the email address
              if (command === 'sendmail' && ['a', 'auth', 'r', 'reset'].includes(currentOpt)) {
                parsedArgs.options[currentOpt] = true;
              }

              const value = args[index + i + 2];

              if (value !== undefined && !value.startsWith('-')) {
                parsedArgs.options[currentOpt] = option.type(value);
              } else {
                if (option.required) {
                  this.stdout.setValue(`Value for ${option.dest} is required.\nSee ${parsedArgs.command} --help`);
                }

                if (option.default !== undefined) {
                  parsedArgs.options[currentOpt] = option.default;
                }
              }
            } else if (currentOpt) {
              // Check for a value for the currentOpt
              parsedArgs.options[currentOpt] = option.type(arg);
              currentOpt = null;
            } else {
              // Handle positional arguments
              if (option.required) {
                // Ensure that the positional argument is present
                if (!arg) {
                  this.stdout.setValue(`Value for ${option.dest} is required.\nSee ${parsedArgs.command} --help`);
                } else {
                  // Check for specific requirements for sendmail and getuser commands
                  var command_values = {
                    commands: ['checkdir', 'crypt'],
                    values: {
                      checkdir: ['max-depth', 'get-links', 'folder', 'ext'],
                      crypt: ['encrypt', 'decrypt', 'algo', 'input']
                      // inject: ['func', 'trigger', 'enum']
                    }
                  }
                  if (command_values.commands.includes(command) && command_values.values[command].inclues(arg)) {
                    this.stdout.setValue(`Invalid use of option ${arg} for ${parsedArgs.command} command.\nSee ${parsedArgs.command} --help`);
                  } else {
                    parsedArgs.options[option.dest] = option.type(arg);
                  }
                }
              } else if (option.default !== undefined) {
                // Use the default value if provided
                parsedArgs.options[option.dest] = option.default;
              }
            }
          }
        }
      }

      return parsedArgs;
    } catch (e) {
      this.Logs(e.stack, 'ArgParse:parse')
      Logger.log(`Whoopsies! Error in parse: ${e.stack}`)
    }
  }
}

/**
 * Represents an argument with specified properties.
 */
class Argument {
  constructor(dest, type, { required = false, default: defaultValue } = {}) {
    this.dest = dest;
    this.type = type || String;
    this.required = required;
    this.default = defaultValue;
  }
}

/**
 * ProgCommands
 * 
 * Executes commands based on parsed arguments and options.
 */
class ProgCommands extends Listener {
  constructor(command, time) {
    super();
    this.command = command.command;
    this.options = command.options || {};
    this.time = time;
    // this.chkdir_stdout_ = ''

    Logger.log(`Command got from the cli: ${this.command}\nWith options: ${JSON.stringify(this.options, null, 2)}`);

    // Default commands.
    this.default = {
      // nargs 0
      help: {
        help: 'Display this help menu and exit',
        shorthelp: 'Display this help menu and exit'
      },
      // nargs 0
      ping: {
        help: 'Usage: ping\nReceive a pong! Check the delay, and response to server.',
        shorthelp: 'Recieve a pong!'
      },
      // nargs 0
      whoami: {
        help: 'Usage: whoami\nReturn the user running the script.',
        shorthelp: 'Returns the user running the script.'
      },
      // nargs 1
      checkdir: {
        opts: ['max-depth', 'get-links', 'folder', 'ext', 'parent', 'MIME'],
        help: `Usage: checkdir [...OPTIONS]\nGet all contents in a specified directory.\n\nOptions:\n\t ext\t Specify file extensions to look for (mp4,mp3,pdf)\n\t MIME\t Specify file MIME types to look for (audio, video, text, model, image, font, application)\n\t max-depth\t print the total for a directory (or file) only if it is N or fewer levels below the command line argument.\n\t get-links\t Get the links to each file in the folder. Options: dl, file. (default: file)\n\t folder\t Specify the folder to run the check on.\n\t parent\t Start the scan from the parent folder.\n\nexample usage:\n   checkdir --max-depth 1 --folder https://drive.google.com/drive/folders/11jWW8TV0dWD1wGChpucKLCXS-BuwikZ0?usp=drive_link --ext txt,mp4\n   checkdir --folder https://drive.google.com/drive/folders/11jWW8TV0dWD1wGChpucKLCXS-BuwikZ0?usp=drive_link --MIME audio,text`,
        shorthelp: `Get all contents in a specified directory.`
      },
      crypt: {
        opts: ['encrypt', 'decrypt', 'algo', 'input'],
        help: `Usage: crypt [...OPTIONS] <string>\nEncrypt or decrypt a string.\n\nOptions:\n\t algo\t Specify an encryption algorithm. (Default: AES-256)\n\t encrypt\t Encrypt a string.\n\t decrypt\t Decrypt an encrypted string.\n\nAlgorithms:\n\t AES\t Use the AES-256 algorithm.\n\t DES\t Use the DES encryption algorithm.\n\t RABBIT\t Use the Rabbit encryption algorithm.\n\t TRIPLEDES\t Use the TripleDES encryption algorithm.`,
        shorthelp: `Encrypt or decrypt a string.`
      }
      // nargs 1
      // inject: {
      //   opts: ['func', 'trigger', 'enum'],
      //   help: 'insft privilege',
      //   shorthelp: 'insft privilege'
      // }
    };
  }

  /**
   * Execute the specified command based on parsed arguments and options.
   * 
   */
  execute() {
    try {
      this.stdout.setValue([`Executing commands...`])
      const validCommands = Object.keys(this.default);

      if (this.command === 'help' || this.options.help) {
        this.stdout.setValue([this._helpMenu()])
      } else if (validCommands.includes(this.command)) {

        // Assign the function to the func property
        //  Assigning static will run the functions prematurely.
        this.default.ping.func = () => this._ping();
        this.default.whoami.func = () => this._whoami();
        this.default.checkdir.func = () => this._checkdir();
        // this.default.inject.func = () => this._poison();

        // Validate flags passed and the opts
        if (Object.keys(this.options).length > 0) {
          this._validateOptions();
        }

        // Check if the command requires positional arguments
        if (this._requiresPositionalArguments(this.command)) {
          this.stdout.setValue([`Checking args...`])
          var command = this.default.checkdir.opts.some(option => this.options[option]);
          // var injectCommand = this.default.inject.opts.some(option => this.options[option]);
          const positionalArg = this.options.arg1 || command // || injectCommand;

          if (!positionalArg) {
            this.stdout.setValue([`Positional argument is required for the ${this.command} command.\nSee \`${this.command} --help' for help`])
            return;
          }
        }

        // Call the assigned function
        this.stdout.setValue([`Executing command...`]);

        if (this.command == 'checkdir') {
          let directory = this.default[this.command].func();
          let this_day = Date.now()
          DriveApp.createFile(`checkdir:${this_day}.txt`, directory);
          // DriveApp.createFile(`checkdir:${this_day}.txt`, this.chkdir_stdout_);
        } else {
          this.default[this.command].func();
        }
      } else {
        this.stdout.setValue([this._helpMenu()])
      }
    } catch (e) {
      this.Logs(e.stack, 'ProgCommands:execute')
      Logger.log(`Whoops! Execute failed: ${e.stack}`);
    }
  }

  /**
   * Display help information based on parsed arguments and options.
   * If a specific command is provided, display help for that command; otherwise, show the general help menu.
   */
  _helpMenu() {
    try {
      this.stdout.setValue(['Showing help...'])
      if (this.subargs && this.subargs.length > 0) {
        const specifiedCommand = this.subargs[0];

        if (this.default[specifiedCommand]) {
          // Display help for the specified command
          const helpMessage = this.default[specifiedCommand].help;
          return helpMessage;
        } else {
          return `Invalid command specified for help: ${specifiedCommand}`;
        }
      } else if (this.options.help) {
        // Display help for the specified command
        const helpMessage = this.default[this.command].help;
        return helpMessage;
      } else {
        // Display general help menu
        const maxCmdLength = Math.max(...Object.keys(this.default).map(cmd => cmd.length));

        const cmdLines = Object.keys(this.default).map(cmd => {
          const trimmedCmd = cmd.trim();
          const paddedCmd = trimmedCmd.padEnd(maxCmdLength + 4);
          return `\t${paddedCmd}${this.default[cmd].shorthelp}`;
        });

        return `These shell commands are defined internally are are not case sensitive.\n\n${cmdLines.join('\n')}\n\nType \`<command> --help' to display more information about that command.\nex.\n\t ping --help\n\t checkdir --help`;
      }
    } catch (e) {
      this.Logs(e.stack, 'ProgCommands:_helpMenu');
      Logger.log(`Whoops! _helpMenu failed: ${e.stack}`)
    }
  }

  /**
   * Validate the options against accepted flags for the specified command.
   * Throws an error if an invalid flag is encountered.
   */
  _validateOptions() {
    try{
      this.stdout.setValue(['Validating args...'])
      const acceptedFlags = this.default[this.command].opts;

      if (acceptedFlags) {
        const parsedFlags = Object.keys(this.options);

        parsedFlags.forEach(flag => {
          if (!acceptedFlags.includes(flag)) {
            this.stdout.setValue([`Invalid flag: ${flag} for command ${this.command}.\nSee \`${this.command} --help' for help`])
          }
        });
      }
    } catch (e) {
      this.Logs(e.stack, 'ProgCommands:_validateOptions')
      Logger.log(`Whoopsies! Error in _validateOptions: ${e.stack}`)
    }
  }

  /**
   * Check if the specified command requires positional arguments.
   * 
   * @param {String} command - The command to check.
   * @return {Boolean} - True if the command requires positional arguments, false otherwise.
   */
  _requiresPositionalArguments(command) {
    return ['inject', 'checkdir'].includes(command);
  }

  /**
   *  Ping
   * 
   *    Pong!
   */
  _ping() {
    try{
      const time = parseInt(Date.now());
      this.stdout.setValue([`Pong! With a time of: ${(parseInt(time) - parseInt(this.time)) / 1000}ms`])
    } catch (e) {
      this.Logs(e.stack, 'ProgCommands:_ping')
      Logger.log(`Whoopsies! Error in _ping: ${e.stack}`)
    }
  }

  /**
   *  _whoami
   * 
   *    Get the authoritative user running the script.
   */
  _whoami() {
    try{
      this.stdout.setValue([String(this.effective_user)]);
    } catch (e) {
      this.Logs(e.stack, 'ProgCommands:_whoami')
      Logger.log(`Whoopsies! Error in _whoami: ${e.stack}`)
    }
  }

  /**
   *  _checkdir
   * 
   *    Check a directory for files
   */
  _checkdir(folder_id) {
    try {
      const folder_id_regex = /\/folders\/([a-zA-Z0-9_-]+)/;
      // const file_id_regex = /\/d\/([a-zA-Z0-9_-]+)/;
      const args_got = this.options;
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

      if (!folder_id) {
        const folder_id_link_match = args_got.folder.match(folder_id_regex);
        const hash_id_match = args_got.folder.match(/[a-zA-Z0-9_-]+/);

        if ((!folder_id_link_match || folder_id_link_match.length < 2) && !hash_id_match) {
          Logger.log("No folder ID found in the provided link.");
          this.stdout.setValue(["No folder ID found in the provided link."])
          return;
        }

        folder_id = folder_id_link_match ? folder_id_link_match[1] : hash_id_match;
      }

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
      console.error('')
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
      return display
    } catch (e) {
      this.Logs(e.stack, 'ProgCommands:_checkdir');
      Logger.log(`Whoopsies! Error in _checkdir: ${e.stack}`);
      return [];
    }
  }
}



function test() {
  const parser = new ArgParse

  parser.addCommand("checkdir", [
    new Argument("arg1"),
    new Argument("arg2"),
    new Argument("arg3"),
    new Argument("arg4"),
    new Argument("arg5"),
    new Argument("arg6"),
    new Argument("arg7"),
    new Argument("arg8"),
    new Argument("arg9"),
    new Argument("arg10"),
  ]);

  const input = '└─│├';

  const inputString = "checkdir --folder https://drive.google.com/drive/folders/1L21GiYc2l2zOEY2RWQi2EtY-jfISwGZ8?usp=drive_link --MIME audio --parent";
  // const inputString = "checkdir --folder https://drive.google.com/drive/folders/1L21GiYc2l2zOEY2RWQi2EtY-jfISwGZ8?usp=drive_link";
  // const inputString = "checkdir --folder https://drive.google.com/drive/folders/1PebYcpr47qagmUr-JpkMkaqgKPTQbOZM?usp=sharing --parent";
  // const inputString = "checkdir --folder 1PebYcpr47qagmUr-JpkMkaqgKPTQbOZM";

  const parsedArgs = parser.parse(inputString);
  const executor = new ProgCommands(parsedArgs);
  executor.execute()

  // Array.from(input).forEach(char => {
  //   Logger.log(`CHAR: ${char} : ${char.charCodeAt(0)}`);
  // })

  // Logger.log(`${String.fromCodePoint(9492)}${String.fromCodePoint(9472)}`)
}
