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
    this.display = 'Append folder hash to this url to peek inside:\nhttps://drive.google.com/drive/folders/\n\nDirectory tree:\n.';
    this.commandArgs = '';
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
   *  tree
   * 
   *    Check a directory for files
   * 
   * @Param: {Object} cmdARGS - Command arguments passed
   */
  // https://www.geeksforgeeks.org/directory-traversal-tools-in-python/
  // https://github.com/kddnewton/tree/blob/main/tree.js
  tree(cmdARGS) {
    const MIMETYPES = {
      "application":{"type":["vnd.lotus-1-2-3","x-krita","x-7z-compressed","octet-stream","x-authorware-bin","x-authorware-map","x-authorware-seg","x-abiword","vnd.americandynamics.acc","x-ace-compressed","vnd.acucobol","vnd.acucorp","vnd.audiograph","x-font-type1","vnd.ibm.modcap","postscript","vnd.adobe.air-application-installer-package+zip","vnd.amiga.ami","vnd.android.package-archive","x-ms-application","vnd.lotus-approach","pgp-signature","vnd.accpac.simply.aso","atom+xml","atomcat+xml","atomsvc+xml","vnd.antix.game-component","applixware","vnd.airzip.filesecure.azf","vnd.airzip.filesecure.azs","vnd.amazon.ebook","x-msdownload","x-bcpio","x-font-bdf","vnd.syncml.dm+wbxml","vnd.fujitsu.oasysprs","vnd.bmi","vnd.framemaker","vnd.previewsystems.box","x-bzip2","x-bzip","vnd.clonk.c4group","vnd.ms-cab-compressed","vnd.curl.car","vnd.ms-pki.seccat","x-director","ccxml+xml","vnd.contact.cmsg","x-netcdf","vnd.mediastation.cdkey","vnd.chemdraw+xml","vnd.cinderella","pkix-cert","x-chat","vnd.ms-htmlhelp","vnd.kde.kchart","vnd.anser-web-certificate-issue-initiation","vnd.ms-artgalry","vnd.claymore","java-vm","vnd.crick.clicker.keyboard","vnd.crick.clicker.palette","vnd.crick.clicker.template","vnd.crick.clicker.wordbank","vnd.crick.clicker","x-msclip","vnd.cosmocaller","vnd.yellowriver-custom-menu","vnd.rim.cod","vnd.debian.binary-package","wasm","x-cpio","mac-compactpro","x-mscardfile","pkix-crl","x-x509-ca-cert","x-csh","vnd.commonspace","cu-seeme","prs.cww","vnd.mobius.daf","vnd.fdsn.seed","davmount+xml","vnd.oma.dd2+xml","vnd.fujixerox.ddd","x-debian-package","vnd.dreamfactory","vnd.mobius.dis","vnd.dna","msword","vnd.ms-word.document.macroenabled.12","vnd.openxmlformats-officedocument.wordprocessingml.document","vnd.ms-word.template.macroenabled.12","vnd.openxmlformats-officedocument.wordprocessingml.template","vnd.osgi.dp","vnd.dpgraph","x-dtbook+xml","xml-dtd","x-dvi","vnd.spotfire.dxp","ecmascript","vnd.novadigm.edm","vnd.novadigm.edx","vnd.picsel","vnd.pg.osasli","emma+xml","vnd.ms-fontobject","epub+zip","vnd.eszigno3+xml","vnd.epson.esf","vnd.novadigm.ext","andrew-inset","vnd.ezpix-album","vnd.ezpix-package","vnd.fdf","vnd.denovo.fcselayout-link","vnd.fujitsu.oasysgp","x-xfig","vnd.micrografx.flo","vnd.kde.kivio","vnd.frogans.fnc","vnd.fsc.weblaunch","vnd.fluxtime.clip","vnd.anser-web-funds-transfer-initiation","vnd.fuzzysheet","vnd.groove-account","vnd.dynageo","vnd.geometry-explorer","vnd.geogebra.file","vnd.geogebra.tool","vnd.groove-help","vnd.groove-identity-message","vnd.gmx","x-gnumeric","vnd.flographit","vnd.grafeq","srgs","vnd.groove-injector","srgs+xml","x-font-ghostscript","x-gtar","vnd.groove-tool-message","x-gzip","gzip","vnd.hbci","vnd.gerber","x-hdf","winhlp","vnd.hp-hpgl","vnd.hp-hpid","vnd.hp-hps","mac-binhex40","vnd.kenameaapp","vnd.yamaha.hv-dic","vnd.yamaha.hv-voice","vnd.yamaha.hv-script","vnd.iccprofile","vnd.shana.informed.formdata","vnd.igloader","vnd.micrografx.igx","vnd.shana.informed.interchange","vnd.accpac.simply.imp","vnd.ms-ims","vnd.shana.informed.package","vnd.ibm.rights-management","vnd.irepository.package+xml","vnd.shana.informed.formtemplate","vnd.immervision-ivp","vnd.immervision-ivu","vnd.jam","java-archive","vnd.jisp","vnd.hp-jlyt","x-java-jnlp-file","vnd.joost.joda-archive","x-trash","x-shellscript","json","vnd.kde.karbon","vnd.kde.kformula","vnd.kidspiration","x-killustrator","vnd.google-earth.kml+xml","vnd.google-earth.kmz","vnd.kinar","vnd.kde.kontour","vnd.kde.kpresenter","vnd.kde.kspread","vnd.kahootz","vnd.kde.kword","x-latex","vnd.llamagraphics.life-balance.desktop","vnd.llamagraphics.life-balance.exchange+xml","vnd.hhe.lesson-player","vnd.route66.link66+xml","lost+xml","vnd.ms-lrm","vnd.frogans.ltf","vnd.lotus-wordpro","x-msmediaview","mathematica","vnd.ecowin.chart","mathml+xml","vnd.sqlite3","x-sqlite3","vnd.mobius.mbk","mbox","vnd.medcalcdata","vnd.mcd","x-msaccess","vnd.mfmp","vnd.proteus.magazine","vnd.mif","vnd.dolby.mlp","vnd.chipnuts.karaoke-mmd","vnd.smaf","x-msmoney","x-mobipocket-ebook","x-iso9660-image","yaml","mp4","vnd.mophun.certificate","vnd.apple.installer+xml","vnd.blueice.multipass","vnd.mophun.application","vnd.ms-project","vnd.ibm.minipay","vnd.mobius.mqy","marc","mediaservercontrol+xml","vnd.fdsn.mseed","vnd.mseq","vnd.epson.msf","vnd.mobius.msl","vnd.muvee.style","vnd.musician","vnd.recordare.musicxml+xml","vnd.mfer","mxf","vnd.recordare.musicxml","xv+xml","vnd.triscape.mxs","vnd.nokia.n-gage.symbian.install","x-dtbncx+xml","vnd.nokia.n-gage.data","vnd.neurolanguage.nlu","vnd.enliven","vnd.noblenet-directory","vnd.noblenet-sealer","vnd.noblenet-web","vnd.lotus-notes","vnd.fujitsu.oasys2","vnd.fujitsu.oasys3","vnd.fujitsu.oasys","x-msbinder","oda","vnd.oasis.opendocument.database","vnd.oasis.opendocument.chart","vnd.oasis.opendocument.formula","vnd.oasis.opendocument.formula-template","vnd.oasis.opendocument.graphics","vnd.oasis.opendocument.image","vnd.oasis.opendocument.presentation","vnd.oasis.opendocument.spreadsheet","vnd.oasis.opendocument.text","ogg","onenote","oebps-package+xml","vnd.palm","vnd.lotus-organizer","vnd.yamaha.openscoreformat","vnd.yamaha.openscoreformat.osfpvg+xml","vnd.oasis.opendocument.chart-template","x-redhat-package-manager","x-perl","x-font-otf","vnd.oasis.opendocument.graphics-template","vnd.oasis.opendocument.text-web","vnd.oasis.opendocument.image-template","vnd.oasis.opendocument.text-master","vnd.oasis.opendocument.presentation-template","vnd.oasis.opendocument.spreadsheet-template","vnd.oasis.opendocument.text-template","vnd.openofficeorg.extension","pkcs10","x-pkcs12","x-pkcs7-certificates","pkcs7-mime","x-pkcs7-certreqresp","pkcs7-signature","vnd.powerbuilder6","x-font-pcf","vnd.hp-pcl","vnd.hp-pclxl","vnd.curl.pcurl","pdf","font-tdpfr","x-chess-pgn","pgp-encrypted","pkixcmp","pkix-pkipath","vnd.3gpp.pic-bw-large","vnd.mobius.plc","vnd.pocketlearn","pls+xml","vnd.ctc-posml","vnd.macports.portpkg","vnd.ms-powerpoint","vnd.ms-powerpoint.template.macroenabled.12","vnd.openxmlformats-officedocument.presentationml.template","vnd.ms-powerpoint.addin.macroenabled.12","vnd.cups-ppd","vnd.ms-powerpoint.slideshow.macroenabled.12","vnd.openxmlformats-officedocument.presentationml.slideshow","vnd.ms-powerpoint.presentation.macroenabled.12","vnd.openxmlformats-officedocument.presentationml.presentation","vnd.lotus-freelance","pics-rules","prql","vnd.3gpp.pic-bw-small","x-font-linux-psf","vnd.pvi.ptid1","x-mspublisher","vnd.3gpp.pic-bw-var","vnd.3m.post-it-notes","x-python-code","vnd.epson.quickanime","vnd.intu.qbo","vnd.intu.qfx","vnd.publishare-delta-tree","vnd.quark.quarkxpress","vnd.rar","x-rar-compressed","vnd.ipunplugged.rcprofile","rdf+xml","vnd.data-vision.rdz","vnd.businessobjects","x-dtbresource+xml","reginfo+xml","resource-lists+xml","resource-lists-diff+xml","vnd.rn-realmedia","vnd.jcp.javame.midlet-rms","relax-ng-compact-syntax","x-rpm","vnd.nokia.radio-presets","vnd.nokia.radio-preset","sparql-query","rls-services+xml","rsd+xml","rss+xml","rtf","vnd.yamaha.smaf-audio","sbml+xml","vnd.ibm.secure-container","x-msschedule","vnd.lotus-screencam","scvp-cv-request","scvp-cv-response","vnd.stardivision.draw","vnd.stardivision.calc","vnd.stardivision.impress","vnd.solent.sdkm+xml","sdp","vnd.stardivision.writer","vnd.seemail","vnd.sema","vnd.semd","vnd.semf","java-serialized-object","set-payment-initiation","set-registration-initiation","vnd.hydrostatix.sof-data","vnd.spotfire.sfs","vnd.stardivision.writer-global","x-sh","x-shar","shf+xml","vnd.wap.sic","vnd.symbian.install","x-stuffit","x-stuffitx","vnd.koan","vnd.wap.slc","vnd.ms-powerpoint.slide.macroenabled.12","vnd.openxmlformats-officedocument.presentationml.slide","vnd.epson.salt","vnd.stardivision.math","smil+xml","x-font-snf","vnd.yamaha.smaf-phrase","x-futuresplash","scvp-vp-response","scvp-vp-request","x-wais-source","sparql-results+xml","vnd.kodak-descriptor","vnd.epson.ssf","ssml+xml","vnd.sun.xml.calc.template","vnd.sun.xml.draw.template","vnd.wt.stf","vnd.sun.xml.impress.template","hyperstudio","vnd.ms-pki.stl","vnd.pg.format","vnd.sun.xml.writer.template","vnd.sus-calendar","x-sv4cpio","x-sv4crc","vnd.svd","x-shockwave-flash","vnd.arastra.swi","vnd.sun.xml.calc","vnd.sun.xml.draw","vnd.sun.xml.writer.global","vnd.sun.xml.impress","vnd.sun.xml.math","vnd.sun.xml.writer","vnd.tao.intent-module-archive","x-tar","vnd.3gpp2.tcap","x-tcl","vnd.smart.teacher","x-tex","x-texinfo","x-tex-tfm","vnd.tmobile-livetv","x-bittorrent","vnd.groove-tool-template","vnd.trid.tpt","vnd.trueapp","x-msterminal","x-font-ttf","vnd.simtech-mindmapper","vnd.genomatix.tuxedo","vnd.mobius.txf","vnd.ufdl","vnd.umajin","vnd.unity","vnd.uoml+xml","x-ustar","vnd.uiq.theme","x-cdlink","vnd.groove-vcard","vnd.vcx","vnd.visionary","vnd.visio","vnd.vsf","voicexml+xml","x-doom","vnd.criticaltools.wbs+xml","vnd.wap.wbxml","vnd.ms-works","x-ms-wmd","x-msmetafile","vnd.wap.wmlc","vnd.wap.wmlscriptc","x-ms-wmz","vnd.wordperfect","vnd.ms-wpl","vnd.wqd","x-mswrite","wsdl+xml","wspolicy+xml","vnd.webturbo","vnd.hzn-3d-crossword","x-silverlight-app","vnd.xara","x-ms-xbap","vnd.fujixerox.docuworks.binder","vnd.syncml.dm+xml","vnd.adobe.xdp+xml","vnd.fujixerox.docuworks","xenc+xml","patch-ops-error+xml","vnd.adobe.xfdf","vnd.xfdl","xhtml+xml","vnd.ms-excel","vnd.ms-excel.addin.macroenabled.12","vnd.ms-excel.sheet.binary.macroenabled.12","vnd.ms-excel.sheet.macroenabled.12","vnd.openxmlformats-officedocument.spreadsheetml.sheet","vnd.ms-excel.template.macroenabled.12","vnd.openxmlformats-officedocument.spreadsheetml.template","xml","vnd.olpc-sugar","xop+xml","x-xpinstall","vnd.is-xpr","vnd.ms-xpsdocument","vnd.intercon.formnet","xslt+xml","vnd.syncml+xml","xspf+xml","vnd.mozilla.xul+xml","vnd.zzazz.deck+xml","zip","x-zip-compressed","zip-compressed","vnd.zul","vnd.handheld-entertainment+xml"],"extension":[".123",".kra",".krz",".7z",".a",".bin",".bpk",".deploy",".dist",".distz",".dmg",".dms",".dump",".elc",".lha",".lrf",".lzh",".o",".obj",".pkg",".so",".aab",".u32",".vox",".x32",".aam",".aas",".abw",".acc",".ace",".acu",".acutc",".atc",".aep",".afm",".pfa",".pfb",".pfm",".afp",".list3820",".listafp",".ai",".eps",".ps",".air",".ami",".apk",".application",".apr",".asc",".sig",".aso",".atom",".atomcat",".atomsvc",".atx",".aw",".azf",".azs",".azw",".bat",".com",".dll",".exe",".msi",".bcpio",".bdf",".bdm",".bh2",".bmi",".book",".fm",".frame",".maker",".box",".boz",".bz2",".bz",".c4d",".c4f",".c4g",".c4p",".c4u",".cab",".car",".cat",".cct",".cst",".cxt",".dcr",".dir",".dxr",".fgd",".swa",".w3d",".ccxml",".cdbcmsg",".cdf",".nc",".cdkey",".cdxml",".cdy",".cer",".chat",".chm",".chrt",".cii",".cil",".cla",".class",".clkk",".clkp",".clkt",".clkw",".clkx",".clp",".cmc",".cmp",".cod",".deb",".udeb",".wasm",".cpio",".cpt",".crd",".crl",".crt",".der",".csh",".csp",".cu",".cww",".daf",".dataless",".seed",".davmount",".dd2",".ddd",".deb",".udeb",".dfac",".dis",".dna",".doc",".dot",".wiz",".docm",".docx",".dotm",".dotx",".dp",".dpg",".dtb",".dtd",".dvi",".dxp",".ecma",".edm",".edx",".efif",".ei6",".emma",".eot",".epub",".es3",".et3",".esf",".ext",".ez",".ez2",".ez3",".fdf",".fe_launch",".fg5",".fig",".flo",".flw",".fnc",".fsc",".ftc",".fti",".fzs",".gac",".geo",".gex",".gre",".ggb",".ggt",".ghf",".gim",".gmx",".gnumeric",".gph",".gqf",".gqs",".gram",".grv",".grxml",".gsf",".gtar",".gtm",".gz",".tgz",".gz",".tgz",".hbci",".gbr",".hdf",".hlp",".hpgl",".hpid",".hps",".hqx",".htke",".hvd",".hvp",".hvs",".icc",".icm",".ifm",".igl",".igx",".iif",".imp",".ims",".ipk",".irm",".irp",".itp",".ivp",".ivu",".jam",".jar",".jisp",".jlt",".jnlp",".joda",".sh",".json",".karbon",".kfo",".kia",".kil",".kml",".kmz",".kne",".knp",".kon",".kpr",".kpt",".ksp",".ktr",".ktz",".kwd",".kwt",".latex",".lbd",".lbe",".les",".link66",".lostxml",".lrm",".ltf",".lwp",".m13",".m14",".mvb",".ma",".mb",".nb",".mag",".mathml",".mml",".db",".sqlite",".sqlite3",".db-wal",".sqlite-wal",".db-shm",".sqlite-shm",".db",".sqlite",".sqlite3",".db-wal",".sqlite-wal",".db-shm",".sqlite-shm",".mbk",".mbox",".mc1",".mcd",".mdb",".mfm",".mgz",".mif",".mlp",".mmd",".mmf",".mny",".mobi",".prc",".iso",".isoimg",".cdr",".yaml",".yml",".mp4s",".mpc",".mpkg",".mpm",".mpn",".mpp",".mpt",".mpy",".mqy",".mrc",".mscml",".mseed",".mseq",".msf",".msl",".msty",".mus",".musicxml",".mwf",".mxf",".mxl",".mxml",".xhvml",".xvm",".xvml",".mxs",".n-gage",".ncx",".ngdat",".nlu",".nml",".nnd",".nns",".nnw",".nsf",".oa2",".oa3",".oas",".obd",".oda",".odb",".odc",".odf",".odft",".odg",".odi",".odp",".ods",".odt",".ogx",".onepkg",".onetmp",".onetoc",".onetoc2",".opf",".oprc",".pdb",".pqa",".org",".osf",".osfpvg",".otc",".rpa",".pm",".pl",".otf",".otg",".oth",".oti",".otm",".otp",".ots",".ott",".oxt",".p10",".p12",".pfx",".p7b",".spc",".p7c",".p7m",".p7r",".p7s",".pbd",".pcf",".pcl",".pclxl",".pcurl",".pdf",".pfr",".pgn",".pgp",".pki",".pkipath",".plb",".plc",".plf",".pls",".pml",".portpkg",".pot",".ppa",".pps",".ppt",".pwz",".potm",".potx",".ppam",".ppd",".ppsm",".ppsx",".pptm",".pptx",".pre",".prf",".prql",".psb",".psf",".ptid",".pub",".pvb",".pwn",".pyc",".pyo",".qam",".qbo",".qfx",".qps",".qwd",".qwt",".qxb",".qxd",".qxl",".qxt",".rar",".rar",".rcprofile",".rdf",".rdz",".rep",".res",".rif",".rl",".rld",".rm",".rms",".rnc",".rpm",".rpss",".rpst",".rq",".rs",".rsd",".rss",".xml",".rtf",".saf",".sbml",".sc",".scd",".scm",".scq",".scs",".sda",".sdc",".sdd",".sdkd",".sdkm",".sdp",".sdw",".vor",".see",".sema",".semd",".semf",".ser",".setpay",".setreg",".sfd-hdstx",".sfs",".sgl",".sh",".shar",".shf",".sic",".sis",".sisx",".sit",".sitx",".skd",".skm",".skp",".skt",".slc",".sldm",".sldx",".slt",".smf",".smi",".smil",".snf",".spf",".spl",".spp",".spq",".src",".srx",".sse",".ssf",".ssml",".stc",".std",".stf",".sti",".stk",".stl",".str",".stw",".sus",".susp",".sv4cpio",".sv4crc",".svd",".swf",".swi",".sxc",".sxd",".sxg",".sxi",".sxm",".sxw",".tao",".tar",".tcap",".tcl",".teacher",".tex",".texi",".texinfo",".tfm",".tmo",".torrent",".tpl",".tpt",".tra",".trm",".ttc",".ttf",".twd",".twds",".txd",".txf",".ufd",".ufdl",".umj",".unityweb",".uoml",".ustar",".utz",".vcd",".vcg",".vcx",".vis",".vsd",".vss",".vst",".vsw",".vsdx",".vssx",".vstx",".vssm",".vstm",".vsf",".vxml",".wad",".wbs",".wbxml",".wcm",".wdb",".wks",".wps",".wmd",".wmf",".wmlc",".wmlsc",".wmz",".wpd",".wpl",".wqd",".wri",".wsdl",".wspolicy",".wtb",".x3d",".xap",".xar",".xbap",".xbd",".xdm",".xdp",".xdw",".xenc",".xer",".xfdf",".xfdl",".xht",".xhtml",".xla",".xlb",".xlc",".xlm",".xls",".xlt",".xlw",".xlam",".xlsb",".xlsm",".xlsx",".xltm",".xltx",".xml",".xpdl",".xsl",".xo",".xop",".xpi",".xpr",".xps",".xpw",".xpx",".xslt",".xsm",".xspf",".xul",".zaz",".zip",".zip",".zip",".zir",".zirz",".zmm"]},"text":{"type":["vnd.in3d.3dml","x-asm","x-c","plain","markdown","x-markdown","css","csv","vnd.curl","vnd.curl.dcurl","prs.lines.tag","x-setext","x-fortran","vnd.fmi.flexstor","vnd.fly","vnd.graphviz","html","calendar","vnd.sun.j2me.app-descriptor","x-java-source","javascript","troff","mathml","vnd.curl.mcurl","x-pascal","x-python","richtext","vnd.curl.scurl","sgml","vnd.wap.si","vnd.wap.sl","vnd.in3d.spot","tab-separated-values","uri-list","x-uuencode","x-vcard","x-vcalendar","vnd.wap.wml","vnd.wap.wmlscript"],"extension":[".3dml",".asm",".s",".c",".cc",".cpp",".cxx",".dic",".h",".hh",".conf",".def",".diff",".in",".ksh",".list",".log",".pl",".text",".txt",".md",".markdown",".mdown",".markdn",".md",".markdown",".mdown",".markdn",".css",".csv",".curl",".dcurl",".dsc",".etx",".f",".f77",".f90",".for",".flx",".fly",".gv",".htm",".html",".ics",".ifb",".jad",".java",".js",".man",".me",".ms",".roff",".t",".tr",".mathml",".mml",".mcurl",".p",".pas",".pp",".inc",".py",".rtx",".scurl",".sgm",".sgml",".si",".sl",".spot",".tsv",".uri",".uris",".urls",".uu",".vcf",".vcs",".wml",".wmls"]},"video":{"type":["3gpp2","3gpp","x-ms-asf","x-msvideo","x-f4v","x-fli","x-flv","vnd.fvt","h261","h263","h264","jpm","jpeg","mpeg","vnd.mpegurl","x-m4v","mj2","quicktime","x-sgi-movie","mp4","x-matroska","ogg","webm","vnd.ms-playready.media.pyv","vnd.vivo","mp2t","x-ms-wm","x-ms-wmv","x-ms-wmx","x-ms-wvx"],"extension":[".3g2",".3gp",".asf",".asx",".avi",".f4v",".fli",".flv",".fvt",".h261",".h263",".h264",".jpgm",".jpm",".jpgv",".m1v",".m2v",".mpa",".mpe",".mpeg",".mpg",".m4u",".mxu",".m4v",".mj2",".mjp2",".mov",".qt",".movie",".mp4",".mp4v",".mpg4",".mkv",".ogv",".webm",".pyv",".viv",".ts",".wm",".wmv",".wmx",".wvx"]},"image":{"type":["avif","heic","x-icns","bmp","prs.btif","cgm","x-cmx","vnd.djvu","vnd.dwg","vnd.dxf","vnd.fastbidsheet","x-freehand","vnd.fpx","vnd.fst","g3fax","gif","x-icon","ief","jpeg","pjpeg","vnd.ms-modi","vnd.fujixerox.edmics-mmr","vnd.net-fpx","webp","x-portable-bitmap","x-pict","x-pcx","x-portable-graymap","png","x-portable-anymap","x-portable-pixmap","vnd.adobe.photoshop","x-cmu-raster","x-rgb","vnd.fujixerox.edmics-rlc","svg+xml","tiff","vnd.wap.wbmp","x-xbitmap","vnd.xiff","x-xpixmap","x-xwindowdump","x-adobe-dng","x-sony-arw","x-canon-cr2","x-canon-crw","x-kodak-dcr","x-epson-erf","x-kodak-k25","x-kodak-kdc","x-minolta-mrw","x-nikon-nef","x-olympus-orf","x-pentax-pef","x-fuji-raf","x-panasonic-raw","x-sony-sr2","x-sony-srf","x-sigma-x3f"],"extension":[".avif",".avifs",".heif",".heic",".icns",".bmp",".btif",".cgm",".cmx",".djv",".djvu",".dwg",".dxf",".fbs",".fh",".fh4",".fh5",".fh7",".fhc",".fpx",".fst",".g3",".gif",".ico",".ief",".jpe",".jpeg",".jpg",".pjpg",".jfif",".jfif-tbnl",".jif",".jpe",".jpeg",".jpg",".pjpg",".jfi",".jfif",".jfif-tbnl",".jif",".mdi",".mmr",".npx",".webp",".pbm",".pct",".pic",".pcx",".pgm",".png",".pnm",".ppm",".psd",".ras",".rgb",".rlc",".svg",".svgz",".tif",".tiff",".wbmp",".xbm",".xif",".xpm",".xwd",".dng",".arw",".cr2",".crw",".dcr",".erf",".k25",".kdc",".mrw",".nef",".orf",".pef",".ptx",".raf",".raw",".rw2",".rwl",".sr2",".srf",".x3f"]},"audio":{"type":["3gpp2","mp4","aac","mp4a-latm","aacp","adpcm","basic","vnd.dts","vnd.dts.hd","vnd.nuera.ecelp4800","vnd.nuera.ecelp7470","vnd.nuera.ecelp9600","vnd.digital-winds","midi","aiff","opus","vnd.lucent.voice","mpeg","x-mpegurl","ogg","x-matroska","webm","vnd.ms-playready.media.pya","x-pn-realaudio","x-pn-realaudio-plugin","vnd.wav","x-ms-wax","x-ms-wma","flac","wav","x-wav","vnd.wave","wave","x-pn-wav","x-aiff"],"extension":[".3g2",".mp4",".m4a",".m4b",".m4p",".m4r",".m4v",".mp4v",".3gp",".3g2",".3ga",".3gpa",".3gpp",".3gpp2",".3gp2",".aac",".m4a",".aacp",".adp",".au",".snd",".dts",".dtshd",".ecelp4800",".ecelp7470",".ecelp9600",".eol",".kar",".mid",".midi",".rmi",".aiff",".aif",".aff",".opus",".lvp",".m2a",".m3a",".mp2",".mp2a",".mp3",".mpga",".m3u",".oga",".ogg",".spx",".mka",".weba",".pya",".ra",".ram",".rmp",".wav",".wax",".wma",".flac"]},"chemical":{"type":["x-cdx","x-cif","x-cmdf","x-cml","x-csml","x-xyz"],"extension":[".cdx",".cif",".cmdf",".cml",".csml",".xyz"]},"model":{"type":["vnd.dwf","vnd.gdl","vnd.gtw","iges","mesh","vnd.mts","vrml","vnd.vtu"],"extension":[".dwf",".gdl",".gtw",".iges",".igs",".mesh",".msh",".silo",".mts",".vrml",".wrl",".vtu"]},"message":{"type":["rfc822"],"extension":[".eml",".mht",".mhtml",".mime",".nws"]},"x-conference":{"type":["x-cooltalk"],"extension":[".ice"]},"font":{"type":["woff","woff2","otf"],"extension":[".woff",".woff2",".otf"]}}

    try {
      delete cmdARGS.command;
      /**
       *  setters
       * 
       *    Maps, filters and sets values for the folder scanning operation.
       * 
       * @Param: {Object} args - The Object returned from _parse
       * @Return: {Object}
       */
      const setters = (args) => {
        const variable_dict = {
          // Return folder hash
          folder: function (args) {
            let has_prop = args.hasOwnProperty('folder');
            if (has_prop) {
              let regex_match = {
                folder: args.folder.match(/\/folders\/([a-zA-Z0-9_-]+)/),
                hash: args.folder.match(/\/?[a-zA-Z0-9_-]{20,}/)
              };

              // Match with folder regex, if not then hash, if not then null;
              let match = regex_match.folder ? String(String(regex_match.folder).match(regex_match.hash)).replace(/^\//, '') : regex_match.hash ? String(regex_match.hash) : null;
              return match != null ? match : null;
            } else {
              return null;
            }
          },
          // Return links
          link: function (args) {
            let has_prop = args.hasOwnProperty('link');
            if (has_prop) {
              return String(args.link).toLowerCase().match(/(dl)|(file)/) ? String(args.link) : 'file';
            } else {
              return 'link';
            }
          },
          // Get max depth
          'max-depth' : function (args) {
            let has_prop = args.hasOwnProperty('max-depth');
            if (has_prop) {
              // return only max-depth of 1 if not specified bc appscript timeout
              let int = parseInt(args['max-depth'])
              return Number.isNaN(int) || int <= 10 && int >= 0 ? int : 1;
            } else return 1;
          },
          // Get extensions to look for
          ext: function(args) {
            let has_prop = args.hasOwnProperty('ext');
            if (has_prop) {
              // Split extensions into an array, clean special characters, join in regex
              let ext = args.ext.split(',').map(ext => ext.toLowerCase().trim());
              let parsed_exts = ext.map(ext => ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
              let regex_ext = new RegExp(parsed_exts.join('|'));

              return regex_ext;
            } else return /\.\w*$/;
          },
          // If starting at parent folder
          parent: function(args) {
            let has_prop = args.hasOwnProperty('parent');
            return has_prop ? true : false;
          },
          // Get MIME types to look for
          // See:
          // https://developers.google.com/apps-script/reference/drive/folder#searchfoldersparams
          // https://developers.google.com/apps-script/reference/drive/folder#searchfilesparams
          MIME: function(args) {
            let has_prop = args.hasOwnProperty('MIME');
            if (has_prop) {
              let keys = args.MIME.split(',');
              let mimes = Object.keys(MIMETYPES).map(key => {
                let found_key = keys.some(k => k == key);
                return found_key ? MIMETYPES[key].extension : null;
              }).filter(n => n != null);

              // Map extensions of MIMETYPE
              this.ext = mimes.flat(2);
              // Return mimetype regex
              return args.MIME.split(',').map(m => {return `(${m})`}).join('|');
            }
          }
        }

        // Required args, default args.
        let required = ['folder']
        let keys = Object.keys(args)
        let has_required = keys.filter(k => required.includes(k)) || [];
        let dict = {}

        // If the arguments do not have the required arg exit.
        if (has_required.length == 0) {
          this.stdout.setValue([`Required flag(s): ${required.map(f => {return f})} are not found in arguments but are needed.`]);
          Logger.log(`Required flag(s): ${required.map(f => {return f})} are not found in arguments but are needed`);
          return null;
        }

        // Map to dict
        keys.forEach(key => {
          let valid_arg = variable_dict[key];
          // If the argument is a valid arguement then map
          if (typeof valid_arg == 'function') {
            dict[`${key}`] = variable_dict[`${key}`](args);
          } else {
            this.stdout.setValue([`Arg: ${key} is not valid for this command, skipping...`]);
            Logger.log(`Arg: ${key} is not valid for this command, skipping...`);
          }
        })

        // Check if the required values are not null or undefined
        let required_values = required.some(key => dict[key] != (null || undefined))
        if (!required_values) {
          this.stdout.setValue([`Required flag(s): ${required.map(f => {return f})} values are invalid.`]);
          Logger.log(`Required flag(s): ${required.map(f => {return f})} values are invalid.`);
          return null;
        }

        return dict;
      }

      /**
       *  operation
       * 
       *    Execute command functionality
       */
      const operation = {
        commandArgs: '',
        /**
         *  folder
         * 
         * @Param: {Class Folder}
         * @Return: {Folder}
         */
        folder: function(arg) {
          return DriveApp.getFolderById(arg);
        },
        /**
         *  link
         * 
         * @Param: {Class Folder/Class File}
         * @Return: {String}
         */
        link: function(arg, link) {
          return link == 'dl' ? arg.getDownloadUrl() : arg.getUrl();
        },
        /**
         *  parent
         * 
         * @Param: {Object} arg - The folder object
         * @Return: {Folder}
         */
        parent: function(arg) {
          let folder = this.folder(arg.folder);
          while(folder.getParents().hasNext()) {
            folder = folder.getParents().next();
          }

          Logger.log(`Got parent folder: ${folder.getName()}:${folder.getId()}`);
          return folder.getId() == (null || undefined) ? this.folder(arg.folder) : this.folder(folder.getId());
        },
        /**
         *  get_content
         * 
         *    retrieves the folder's content. Files, Folders, etc.
         * 
         * @Param: {Folder Iterator} fIterator - Folder/File Object iterator
         * @Return: {Object}
         */
        get_content: function(commandArgs, oper = 'folder') {
          let buffer = [];
          let hasObject = commandArgs.hasOwnProperty('parentObj') ? true : false;
          let folder = oper == 'folder' && hasObject ? commandArgs.parentObj.folder_folders : null;
          let files = oper == 'files' && hasObject ? commandArgs.parentObj.folder_files : null;
          let fIterator = folder != null ? folder : files != null ? files : commandArgs;

          while (fIterator.hasNext()) {
            const fCurrent = fIterator.next();
            const fCurrentName = fCurrent.getName();
            const fCurrentID = fCurrent.getId();

            const mimeType = fCurrent.hasOwnProperty('getMimeType') ? fCurrent.getMimeType() : DriveApp.getFileById(fCurrentID).getMimeType();
            const link = this.commandArgs.hasOwnProperty('link') == (null || undefined) ? '' : this.commandArgs.link;
            const fCurrentLink = link && mimeType != null ? this.link(fCurrent, link) : '';
            const type = mimeType.match(/folder/) ? 'folder' : 'file';

            // Parse out url link to retrieve drive id.
            const url = this.link(fCurrent, link);
            const pathOnly = url.replace(/https:\/\/[^\/]+/, '');
            const match = pathOnly.match(/[a-zA-Z0-9_-]{20,}\//);
            const cleanedLink = match ? match[0].replace(/\/$/, '') : ''; 

            const display_link = link && mimeType != null ? type == 'folder' ? `:${String(this.link(fCurrent, link)).match(/\/folders\/([a-zA-Z0-9_-]+)/)[1]}` : `:${cleanedLink}` : '';
            const display = `${fCurrentName}${mimeType.match(/(folder)|(shortcut)/) ? '/ 📁' : ' 📄'}${display_link}`;

            // Set the variables for the current folder/file being scanned
            let tree = {
              name: display,
              link: fCurrentLink,
              id: fCurrentID,
              mime: mimeType,

              type: type,
            }

            if (type == 'file' && mimeType.match(this.commandArgs.MIME)) {
              buffer.push(tree);
            } else if (type == 'folder') {
              folder = fCurrent.getFolders()
              files = fCurrent.getFiles();

              // Check if it's an empty folder
              if (folder.hasNext() || files.hasNext()) {
                folder = files.hasNext() ? files : folder

                let token = folder.getContinuationToken();
                tree['token'] = token;

                buffer.push(tree)
              }
            }
          }

          return buffer;
        },
      }

      /**
       *  walk
       * 
       *    walk the directory, and subdirectories
       * 
       * @Param: {Object} directory - The directory object to be scanned through
       * @Param: {String} prefix - The prefix of the directory
       * @Return: {String}
       */
      function walk(directory, prefix = ''){
        let tree = '';
        directory.forEach((file, index, numberOfFiles) => { 
          let fileType = file.type;
          const parts = index == numberOfFiles.length - 1 ? ["└── ", "    "] : ["├── ", "│   "]
          tree += `\n${prefix}${parts[0]}${file.name}`

          if (fileType == 'folder') {
            let token = DriveApp.continueFolderIterator(file.token);
            let recursive = operation.get_content(token);
            tree += walk(recursive, `${prefix}${parts[1]}`);
          }
        });

        return tree
      }

      let commandArgs = setters(cmdARGS);
      if (commandArgs == null) return;
      // Logger.log(`CMDARGS: ${JSON.stringify(cmdARGS, null, 2)}`)
      // Logger.log(`COMMANDARGS: ${JSON.stringify(commandArgs, null, 2)}`);

      // Set parent folder and files iterator
      let parent = commandArgs.parent ? operation.parent(commandArgs) : operation.folder(commandArgs.folder);
      commandArgs['parentObj'] = {
        name: parent.getName(),
        id: parent.getId(),
        folder_files: parent.getFiles(),
        folder_folders: parent.getFolders()
      }
      // Set command arguments
      operation.commandArgs = commandArgs;

      // Initial directory folder push
      console.warn('Getting folders')
      let folders = operation.get_content(commandArgs);
      console.warn('Getting files')
      let files = operation.get_content(commandArgs , 'files');
      console.warn('Walking directories')

      // Add to display.
      this.display += `\n└── ${commandArgs.parentObj.name}`
      this.display += walk(folders.concat(files), '    ');

      Logger.log(this.display)

      let this_day = Date.now()
      let create_file = DriveApp.createFile(`tree:${this_day}.txt`, this.display);

      this.stdout.setValue([`=HYPERLINK("${create_file.getUrl()}", "Created file ${create_file.getName()}")`])
    } catch (e) {
      this.Logs(e.stack, 'ProgCommands:_tree');
      Logger.log(`Whoopsies! Error in _tree: ${e.stack}`);
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
        tree        Get all contents in a specified directory.
        crypt       Encrypt or decrypt a string.

Type \`<command> --help' to display more information about that command:
         ping --help
         tree --help`})
  )

  arg.addCommand('ping',
    new Arguments({help: 'Usage: ping\nReceive a pong! Check the delay, and response to server.'})
  )

  arg.addCommand('whoami',
    new Arguments({help: 'Usage: whoami\nReturn the user running the script.'})
  )

  arg.addCommand('tree',
    new Arguments({ flags: ['folder', 'max-depth', 'link', 'ext', 'parent', 'MIME'], help: 'Usage: tree [...OPTIONS]\nGet all contents in a specified directory.\n\nOptions:\n\t ext\t Specify file extensions to look for (mp4,mp3,pdf)\n\t MIME\t Specify file MIME types to look for (audio, video, text, model, image, font, application)\n\t max-depth\t print the total for a directory (or file) only if it is N or fewer levels below the command line argument.\n\t link\t Get/Show the link hashes for each file in the folder. Options: (dl, file).\n\t folder\t Specify the folder to run the check on.\n\t parent\t Start the scan from the parent folder.\n\nexample usage:\n   tree --max-depth 1 --folder https://drive.google.com/drive/folders/11jWW8TV0dWD1wGChpucKLCXS-BuwikZ0?usp=drive_link --ext txt,mp4\n   tree --folder 11jWW8TV0dWD1wGChpucKLCXS-BuwikZ0 --MIME audio,text' })
  )

  arg.addCommand('crypt',
    new Arguments({ flags: ['algo', 'encrypt', 'decrypt', 'key'], help: `Usage: crypt [...OPTIONS]\nEncrypt a string or file with a specified algorithm.\n\nOptions:\n\t algo\t Specify an algorithm to use. (AES)\n\t encrypt\t Encrypt the String or File.\n\t decrypt\t Decrypt the String or File.\n\t key\t The passphrase used to encrypt or decrypt.`})
  )

  // const inputString = 'ping --url --host 127.0.0.1';
  // const inputString = 'crypt --algo aes --encrypt "Hello, World!" --key P455W0RD123';
  // const inputString = "tree --folder 1L21GiYc2l2zOEY2RWQi2EtY-jfISwGZ8 --parent --MIME audio --max-depth 5";
  const inputString = "tree --folder 1L21GiYc2l2zOEY2RWQi2EtY-jfISwGZ8 --parent";
  // const inputString = "tree --folder https://drive.google.com/drive/folders/11jWW8TV0dWD1wGChpucKLCXS-BuwikZ0?usp=drive_link --ext .txt,.pdf";
  // const inputString = "tree --folder https://drive.google.com/drive/folders/11jWW8TV0dWD1wGChpucKLCXS-BuwikZ0?usp=drive_link --parent --MIME audio";
  // const inputString = "tree --folder 108FNUq20U7Pkg_XKVFy8nML8RUJTxO_H"; //// Too long exec
  // const inputString = "tree";
  // const inputString = 'whoami';


  const parsed_args = arg._parse(inputString);
  // Logger.log(JSON.stringify(parsed_args, null, 2));
  parsed_args != null ? arg._execute(parsed_args) : [];
}
