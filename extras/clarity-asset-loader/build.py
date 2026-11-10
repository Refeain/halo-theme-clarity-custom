"""Build with ECJ and the running Halo container's Java 21 API dependencies."""
import pathlib
import subprocess
import tempfile
import zipfile

root = pathlib.Path(__file__).resolve().parent
container = '1Panel-halo-1Mh1'
work = subprocess.check_output(['docker', 'exec', container, 'mktemp', '-d', '/tmp/clarity-assets-XXXXXX'], text=True).strip()
subprocess.run(['docker', 'cp', str(root / 'src'), container + ':' + work + '/src'], check=True)
subprocess.run(['docker', 'cp', str(root / 'ecj.jar'), container + ':' + work + '/ecj.jar'], check=True)
libraries = subprocess.check_output(['docker', 'exec', container, 'ls', '/application/lib'], text=True).splitlines()
classpath = ':'.join('/application/lib/' + name for name in libraries if name.endswith('.jar'))
subprocess.run(['docker', 'exec', container, 'sh', '-c',
    'mkdir -p ' + work + '/classes && java -jar ' + work + '/ecj.jar -21 -proc:none '
    '-cp "' + classpath + '" -d ' + work + '/classes '
    + work + '/src/main/java/cn/yuyt/assets/*.java'], check=True)
with tempfile.TemporaryDirectory(prefix='clarity-classes-') as destination:
    subprocess.run(['docker', 'cp', container + ':' + work + '/classes', destination + '/classes'], check=True)
    with zipfile.ZipFile(root / 'clarity-asset-loader-1.0.0.jar', 'w', zipfile.ZIP_DEFLATED) as jar:
        jar.writestr('META-INF/MANIFEST.MF', 'Manifest-Version: 1.0\r\nPlugin-Main-Class: run.halo.app.plugin.BasePlugin\r\nImplementation-Version: 1.0.0\r\n\r\n')
        jar.writestr('META-INF/plugin-components.idx', 'cn.yuyt.assets.AssetHeadProcessor\n')
        for base in [pathlib.Path(destination) / 'classes', root / 'src/main/resources']:
            for path in base.rglob('*'):
                if path.is_file(): jar.write(path, str(path.relative_to(base)))
print(root / 'clarity-asset-loader-1.0.0.jar')
