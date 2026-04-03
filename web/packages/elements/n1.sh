node -e "
      import * as sass from 'sass';
      try {
        const result = sass.compile('src/drawer/drawer.scss', {
          loadPaths: ['./src'],
          importers: [new sass.NodePackageImporter(process.cwd() + '../..')],
          style: 'expanded',
        });
        console.log('SUCCESS');
      } catch(e) {
        console.log('ERROR:', e.message);
      }
      " 2>&1
