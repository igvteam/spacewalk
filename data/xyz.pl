#!/usr/local/bin/perl
use strict;
use warnings;
use File::Basename;
use File::Path qw(make_path remove_tree);
use List::Util qw(reduce any all none notall first max maxstr min minstr product sum sum0 pairs unpairs pairkeys pairvalues pairfirst pairgrep pairmap shuffle uniq uniqnum uniqstr);

my @filenames = <*.csv>;
for my $filename (@filenames) {
 
    my $CSV_FH;

    open($CSV_FH, '<', $filename) or die "Could not open file '$filename' for reading $!";
    chomp(my @lines = <$CSV_FH>);
    close $CSV_FH;

    # split filname into parts
    my ($name, $ignore, $extension) = fileparse($filename, qr/\.[^.]*/);

    my $dev_null;

    # $name is of the form HCT116_chr21-34-37Mb_6h_auxin


    # HCT116_chr21 34 37Mb_6h_auxin
    my @pieces = split('-', $name);
    # print "pieces @pieces\n";

    # HCT116_chr21. @pieces now is (34 37Mb_6h_auxin)
    $dev_null = shift @pieces;

    # HCT116 chr21
    my @path_parts = split('_', $dev_null);

    # 'chr21 / HCT116 /'
    my $path = "$path_parts[1]/$path_parts[0]";

    # 34 | 37Mb_6h_auxin. @pieces is now empty
    my ($a, $b) = (shift @pieces, shift @pieces);

    my $mb_start = $a;

    # @remainder = (37Mb 6h auxin)
    my @remainder = split('_', $b);
    # print "remainder @remainder\n";

    my $mb_end;
    if (($#remainder + 1) == 1) {
        $mb_end = shift @remainder;
    } else {

        # @remainder = (6h auxin)
        $mb_end = shift @remainder;

        # 6h_auxin
        my $final = join('_', @remainder);
        # print "final $final\n";

        # 'chr21 / HCT116 / 6h_auxin'
        $path = "$path/$final";
    }

    @pieces = split('Mb', $mb_end);
    $mb_end = shift @pieces;

    $path = "$path";
    # print "path $path\n";

    # if exists, rmdir
    my $removed = remove_tree($path);
    # print "remove_tree $path\n";

    # mkdir and cd into it
    my @created = make_path($path);
    # print "created @created\n";

    my $dir = pop @created;
    # print "dir $dir.\n";

    # first two lines contain explainatory info
    my ($blurb, $column_labels) = (shift @lines, shift @lines);

    my ($README_FH, $readme) = (undef, "$dir/README.txt");
    open($README_FH, ">", $readme) or die "ERROR: Could not open and write to '$readme' $!";

    print $README_FH "Segment centroid locations (nm). Genomic range (mb) $mb_start to $mb_end. Genomic distance between segments (kb) 30\n";
    print $README_FH "x | y | z\n";
    close $README_FH;

    my $last = $#lines;
    my $length = 1 + $last;

    my ($molecule_index_current, $FH);
    my (@exe, @wye, @zee) = ((), (), ());
    my $fn;
    for (my $i = 0; $i < $length; $i++) {

        my @parts = split(',', $lines[ $i ]);

        # column 0 - chromosome index
        my $molecule_index = shift @parts;

        # column 1 - segment index ignore, it is implied from the sequence order
        $dev_null = shift @parts;

        # column 2, 3, 4 - z | x | y
        my ($z, $x, $y) = (shift @parts, shift @parts, shift @parts);
        push @exe, $x;
        push @wye, $y;
        push @zee, $z;

        if ($last == $i || (defined($molecule_index_current) && $molecule_index != $molecule_index_current)) {

            print "finished accumulating xyz for $fn\n";

            undef $molecule_index_current;
 
            if (defined($FH)) {

                print "bbox and centroid to $fn\n";

                my $min_x = min grep(!/nan/, @exe);
                my $min_y = min grep(!/nan/, @wye);
                my $min_z = min grep(!/nan/, @zee);

                my $max_x = max grep(!/nan/, @exe);
                my $max_y = max grep(!/nan/, @wye);
                my $max_z = max grep(!/nan/, @zee);

                my ($center_x, $center_y, $center_z) = (0.5 * ($min_x + $max_x), 0.5 * ($min_y + $max_y), 0.5 * ($min_z + $max_z));

                # bbox centered at 0,0,0
                my ( $a,  $b,  $c) = ($min_x - $center_x, $min_y - $center_y, $min_z - $center_z);
                my ($aa, $bb, $cc) = ($max_x - $center_x, $max_y - $center_y, $max_z - $center_z);

                print     "bbox $a $b $c $aa $bb $cc\n";
                print $FH "bbox $a $b $c $aa $bb $cc\n";

                for (my $index = 0; $index <= $#exe; $index++) {

                    # print "$exe[ $index ] $wye[ $index ] $zee[ $index ]\n";

                    # molecule centered at 0,0,0
                    my $xx = "nan" == $exe[ $index ] ? "FOO" : $exe[ $index ] - $center_x;
                    my $yy = "nan" == $wye[ $index ] ? "FOO" : $wye[ $index ] - $center_y;
                    my $zz = "nan" == $zee[ $index ] ? "FOO" : $zee[ $index ] - $center_z;
    
                    print     "$xx $yy $zz\n";                
                    print $FH "$xx $yy $zz\n";
                }

                close $FH;

                $FH = undef;
                (@exe, @wye, @zee) = ((), (), ());
            }
        }

        unless ($last == $i || defined($molecule_index_current)) {

            $molecule_index_current = $molecule_index;
            
            my $padded = sprintf("%06d", $molecule_index_current);
            $fn = "$dir/$padded.txt";
            
            open($FH, ">", $fn) or die "Could not open file '$fn' $!";
            print "open $fn for writing\n";
        }

    }

}
