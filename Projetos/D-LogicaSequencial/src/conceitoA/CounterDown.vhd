-- Elementos de Sistemas
-- CounterDown.vhd

library ieee;
use ieee.std_logic_1164.all;

entity CounterDown is
	port(
		clock:  in std_logic;
		q:      out std_logic_vector(2 downto 0) :=(others => '0')
	);
end entity;

architecture arch of CounterDown is
	component FlipFlopT is
		port(
			clock:  in std_logic;
			t:      in std_logic;
			q:      out std_logic:= '0';
			notq:   out std_logic:= '1'
		);
	end component;

	signal t;
	signal output0, output1, output2;
	
begin

	flipflopt1: FlipFlopt port map (clock, t => 1, output0);
	flipflopt2: FlipFlopt port map (output0, t => 1, output1);
	flipflopt3: FlipFlopt port map (output1, t => 1, output2);

	q <= output0 & output1 & output2

end architecture;
