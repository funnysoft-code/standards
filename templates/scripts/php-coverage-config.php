<?php

declare(strict_types=1);

// Keep the application's suites, bootstrap, and environment. Replace only the
// coverage source with the include list from docs/playbook/quality.md.
$file = is_file('phpunit.xml') ? 'phpunit.xml' : 'phpunit.xml.dist';
if (!is_file($file) || !class_exists(DOMDocument::class)) {
    fwrite(STDERR, "php-gate: phpunit.xml and the PHP DOM extension are required\n");
    exit(1);
}
$xml = new DOMDocument;
if (!$xml->load($file, LIBXML_NONET)) {
    exit(1);
}
$api = ($argv[2] ?? '') === 'services/api';
$paths = [];
if ($api) {
    foreach (glob('Modules/*', GLOB_ONLYDIR) ?: [] as $module) {
        foreach (['Actions', 'Http', 'Data', 'Repositories', 'Support', 'Policies', 'Models', 'Enums', 'Notifications', 'Import', 'Console'] as $directory) {
            $paths[] = "$module/$directory";
        }
    }
    foreach (['Http', 'Actions', 'Support', 'Exceptions'] as $directory) {
        $paths[] = "app/$directory";
    }
} else {
    foreach (['Actions', 'Http', 'Data', 'Repositories', 'Models', 'Policies', 'Services', 'Jobs', 'Events', 'Listeners', 'Notifications', 'Enums'] as $directory) {
        $paths[] = "app/$directory";
    }
}
$paths = array_values(array_filter($paths, is_dir(...)));
if ($paths === []) {
    fwrite(STDERR, "php-gate: no named product-code directories found\n");
    exit(1);
}
$xpath = new DOMXPath($xml);
foreach ($xpath->query('/phpunit/source') as $old) {
    $old->parentNode->removeChild($old);
}
$source = $xml->documentElement->appendChild($xml->createElement('source'));
$include = $source->appendChild($xml->createElement('include'));
foreach ($paths as $path) {
    $directory = $include->appendChild($xml->createElement('directory'));
    $directory->setAttribute('suffix', '.php');
    $directory->appendChild($xml->createTextNode($path));
}
if ($xml->save($argv[1]) === false) {
    exit(1);
}
