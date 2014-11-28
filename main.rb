require 'rubygems' if RUBY_VERSION < "1.9"
require 'sinatra'

class Main < Sinatra::Base

	set :public_folder, File.dirname(__FILE__) + '/public'

	get '/' do
		redirect '/index.html'
	end
end
