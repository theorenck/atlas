require 'rubygems' if RUBY_VERSION < "1.9"
require 'sinatra'
require 'sinatra/reloader' if development?
require 'rack/cors'
require 'odbc_utf8'
require 'json'

class Atlas < Sinatra::Base

	set :public_folder, File.dirname(__FILE__) + '/public'

	get '/' do
		redirect '/index.html'
	end
end
