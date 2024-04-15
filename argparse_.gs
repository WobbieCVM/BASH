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
      this.cli.setValue(['Parsing commands...']);
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
                  this.cli.setValue(`Value for ${option.dest} is required.\nSee ${parsedArgs.command} --help`);
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
                  this.cli.setValue(`Value for ${option.dest} is required.\nSee ${parsedArgs.command} --help`);
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
                    this.cli.setValue(`Invalid use of option ${arg} for ${parsedArgs.command} command.\nSee ${parsedArgs.command} --help`);
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
    this.chkdir_stdout_ = ''

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
        opts: ['max-depth', 'get-links', 'folder', 'ext', 'parent'],
        help: `Usage: checkdir [...OPTIONS]\nGet all contents in a specified directory.\n\nOptions:\n\t max-depth\t print the total for a directory (or file) only if it is N or fewer levels below the command line argument.\n\t get-links\t Get the links to each file in the folder. Options: dl, file. (default: file)\n\t folder\t Specify the folder to run the check on.\n\t parent\t Start the scan from the parent folder.\n\nexample usage:\n   checkdir --max-depth 1 --folder https://drive.google.com/drive/folders/11jWW8TV0dWD1wGChpucKLCXS-BuwikZ0?usp=drive_link --ext txt,mp4`,
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
      this.cli.setValue([`Executing commands...`])
      const validCommands = Object.keys(this.default);

      if (this.command === 'help' || this.options.help) {
        this.cli.setValue([this._helpMenu()])
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
          this.cli.setValue([`Checking args...`])
          var command = this.default.checkdir.opts.some(option => this.options[option]);
          // var injectCommand = this.default.inject.opts.some(option => this.options[option]);
          const positionalArg = this.options.arg1 || command // || injectCommand;

          if (!positionalArg) {
            this.cli.setValue([`Positional argument is required for the ${this.command} command.\nSee \`${this.command} --help' for help`])
            return;
          }
        }

        // Call the assigned function
        this.cli.setValue([`Executing command...`]);

        if (this.command == 'checkdir') {
          this.default[this.command].func();
          let this_day = Date.now()
          DriveApp.createFile(`checkdir:${this_day}.txt`, this.chkdir_stdout_);
        } else {
          this.default[this.command].func();
        }
      } else {
        this.cli.setValue([this._helpMenu()])
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
      this.cli.setValue(['Showing help...'])
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
      this.cli.setValue(['Validating args...'])
      const acceptedFlags = this.default[this.command].opts;

      if (acceptedFlags) {
        const parsedFlags = Object.keys(this.options);

        parsedFlags.forEach(flag => {
          if (!acceptedFlags.includes(flag)) {
            this.cli.setValue([`Invalid flag: ${flag} for command ${this.command}.\nSee \`${this.command} --help' for help`])
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
      this.cli.setValue([`Pong! With a time of: ${(parseInt(time) - parseInt(this.time)) / 1000}ms`])
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
      this.cli.setValue([String(this.effective_user)]);
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
  _checkdir(folder_id, depth = 0) {
    try {
      const folder_id_regex = /\/folders\/([a-zA-Z0-9_-]+)/;
      // const file_id_regex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
      const args_got = this.options;
      var link = 'file';

      if (args_got['get-link']) {
        if (!args_got['get-link'].match(/(file)|(dl)/)) {
          link = 'file';
        } else {
          link = args_got['get-link'];
        }
      }

      if (!args_got.folder) {
        this.cli.setValue(["Unknown folder: ", args_got.folder]);
        return;
      }

      if (!folder_id) {
        const folder_id_match = args_got.folder.match(folder_id_regex);
        if (!folder_id_match || folder_id_match.length < 2) {
          Logger.log("No folder ID found in the provided link.");
          this.cli.setValue(["No folder ID found in the provided link."])
          return;
        }

        folder_id = folder_id_match[1];
      }

      var folder = DriveApp.getFolderById(folder_id);

      if (Object.keys(args_got).includes('parent')) {
        var parentFolder = folder;
        // let tree = [];

        // tree.push({
        //   name: parentFolder.getName(),
        //   id: parentFolder.getId()
        // })

        while (parentFolder.getParents().hasNext()) {
          parentFolder = parentFolder.getParents().next();
          // tree.push({
          //   name: parentFolder.getName(),
          //   id: parentFolder.getId()
          // })
          // Logger.log(`IN: ${parentFolder.getName()}\nID: ${parentFolder.getId()}`)
        }

        var folder = DriveApp.getFolderById(parentFolder.getId());

        // if (tree.length == 1) {
        //   Logger.log(`Utmost parent folder ID: ${parentFolder.getId()}`);
        //   var folder = DriveApp.getFolderById(parentFolder.getId());
        // } else {
        //   var folder = DriveApp.getFolderById(String(parentFolder.getId()))
        // }
      }

      if (!folder) {
        Logger.log(`Folder with ID ${folder_id} not found.`);
        this.cli.setValue([`Folder with ID: ${folder_id} not found`]);
        return;
      }

      const folder_files = folder.getFiles();

      let header_ = `\n${folder.getName()}:${String(folder.getUrl()).match(folder_id_regex)[1]}\n`;
      this.chkdir_stdout_ += `${header_}${'#'.repeat(header_.length)}\n`;

      const file_extensions = args_got.ext ? args_got.ext : null;
      let ext_regex;

      if (file_extensions) {
        const extensionsArray = file_extensions.split(",").map(ext => ext.trim());
        const escapedExtensions = extensionsArray.map(ext => ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        ext_regex = new RegExp(escapedExtensions.join("|"));
      } else {
        ext_regex = /\.\w*$/;
      }

      while (folder_files.hasNext()) {
        const file = folder_files.next();
        const file_name = file.getName();
        // const file_url = link == 'dl' ? file.getDownloadUrl() : String(file.getUrl()).match(file_id_regex)[1];
        const file_url = link == 'dl' ? file.getDownloadUrl() : file.getUrl();

        if (file_name.match(ext_regex)) {
          this.chkdir_stdout_ += `${file_name}:${file_url}\n`;
        }
      }

      const subfolders = folder.getFolders();
      if (depth < parseInt(args_got['max-depth'] || 100)) {
        while (subfolders.hasNext()) {
          const subfolder = subfolders.next();
          this._checkdir(subfolder.getId(), depth + 1);
        }
      }

      Logger.log(this.chkdir_stdout_);
    } catch (e) {
      this.Logs(e.stack, 'ProgCommands:_checkdir');
      Logger.log(`Whoopsies! Error in _checkdir: ${e.stack}`);
      return [];
    }
  }

  /**
   *  _crypt
   * 
   *    Encrypt or Decrypt a string.
   */
  _crypt(){

  }




  // _poison() {
  //   const values = String(this.e.value);

  //   if (Object.keys(this.options).includes('func')){
  //     let func = values.match(/\[BOF\](.*?)\[EOF\]/, '')[1];
  //     this.cache.put('exec', String(func), 21600);
  //   }
  // }
}

function a() {
  const parser = new ArgParse();

  parser.addCommand("help", [
    new Argument("arg1"),
  ]);

  parser.addCommand("ping", [
    new Argument("arg1"),
  ]);

  parser.addCommand("whoami", [
    new Argument("arg1"),
  ]);

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

  parser.addCommand("crypt", [
    new Argument("arg1"),
    new Argument("arg2"),
    new Argument("arg3"),
    new Argument("arg4"),
    new Argument("arg5")
  ])

  // parser.addCommand("inject", [
  //   new Argument("arg1"),
  //   new Argument("arg2")
  // ]);

  // const inputString = "checkdir --folder https://drive.google.com/drive/folders/0B2ay4JgKNoPeQlR0M2NmTE81VUU?resourcekey=0-k8Hi-jQx0gtf_HZXsBnuLA&usp=drive_link";
  // const inputString = "checkdir --folder https://drive.google.com/drive/folders/1WcrF78qumEoC6FlPQ_AgW9yd9Tf4kBLQ?usp=drive_link --get-link dl";
  // const inputString = "checkdir --folder https://drive.google.com/drive/folders/0B1IrvDSvOU2zR0VvZHEtLVFiSnM --get-link dl";
  // const inputString = "checkdir --folder https://drive.google.com/drive/folders/0B1IrvDSvOU2zR0VvZHEtLVFiSnM --get-link dl --parent";
  // const inputString = "checkdir --folder https://drive.google.com/drive/folders/1L21GiYc2l2zOEY2RWQi2EtY-jfISwGZ8?usp=drive_link --get-link dl --parent";
  // const inputString = "checkdir --folder https://drive.google.com/drive/folders/0Bzv_SGk2WEdHRElmdFRubzdrbDA --get-link dl --parent"; // bad
  // const inputString = "checkdir --folder https://drive.google.com/drive/folders/0Bzv_SGk2WEdHRElmdFRubzdrbDA --parent"; // bad
  // const inputString = "checkdir --folder https://drive.google.com/drive/folders/0B3DfYHxscpQfbm9TMWFTb29uSVU?resourcekey=0-2T1YAYk8D136iSu95FP5VAs --get-link dl --ext mp4,avi,flv,mov"; // bad
  const inputString = "checkdir --folder https://drive.google.com/drive/folders/1L21GiYc2l2zOEY2RWQi2EtY-jfISwGZ8?usp=drive_link --get-link dl --ext mp4,avi,flv,mov"; // bad

  // const inputString = "inject --func [BOF]testing() { Logger.log(`Hello, World!`);[EOF]";
  // Logger.log(inputString.match(/\[BOF\](.*?)\[EOF\]/, '')[1])


  const parsedArgs = parser.parse(inputString);
  const executor = new ProgCommands(parsedArgs);
  executor.execute()
}
