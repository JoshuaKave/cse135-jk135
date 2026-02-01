#!/usr/bin/perl

print "Cache-Control: no-cache\n";
print "Content-Type: text/html\n\n";

print "<!DOCTYPE html>";
print "<html>";
print "<head>";
print "<title>Josh's CGI World</title>";
print "</head>";
print "<body>";

print "<h1 align=center>Josh exclaims: Hello HTML World</h1><hr/>";
print "<p>Hello World &#128515;</p>";
print "<p>This page was generated with the Perl programming language</p>";

$date = localtime();
print "<p>This program was generated at: $date</p>";

# IP Address is an environment variable when using CGI
$address = $ENV{REMOTE_ADDR};
print "<p>Your current IP Address is: $address</p>";

print "</body>";
print "</html>";
