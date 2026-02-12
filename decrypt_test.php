<?php
$secret_key = 'PNS2AREA';
$secret_iv = 'SyS4School';

function encrypt_decrypt($action, $string)
{
    global $secret_key, $secret_iv;
    $output = false;

    $encrypt_method = 'AES-256-CBC';
    // hash
    $key = hash('sha256', $secret_key); // Returns 64-char hex string
    
    // iv - encrypt method AES-256-CBC expects 16 bytes
    $iv = substr(hash('sha256', $secret_iv), 0, 16); // Returns 16 char string

    if ($action == 'encrypt') {
        $output = openssl_encrypt($string, $encrypt_method, $key, 0, $iv);
        $output = base64_encode($output);
    } elseif ($action == 'decrypt') {
        $output = openssl_decrypt(base64_decode($string), $encrypt_method, $key, 0, $iv);
    }

    return $output;
}

echo "Admin Pass (root/admin): " . encrypt_decrypt('decrypt', 'QnQ5U2FvZ0orYXVQT3FmRXZ0emJvdz09') . "\n";
echo "Montree Pass: " . encrypt_decrypt('decrypt', 'dTQrQndjVFpVQVJkV2hvVFFjTDQ3QT09') . "\n";
echo "Director Pass: " . encrypt_decrypt('decrypt', 'V2FGelRoUnVkRlZUdVJORmVlRmZEZz09') . "\n";
?>
