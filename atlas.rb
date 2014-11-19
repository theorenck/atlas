require 'rubygems' if RUBY_VERSION < "1.9"
require 'sinatra'
require 'sinatra/reloader' if development?
require 'rack/cors'
require 'odbc_utf8'
require 'json'

class Atlas < Sinatra::Base

	set :static, true
	set :public_folder, File.dirname(__FILE__) + '/public'

	datasource = 'atlas'
	api_path = '/api'

	use Rack::Cors do
	  allow do
	    origins '*'
	    resource "#{api_path}/*", :headers => :any, :methods => [:get, :post, :put, :delete]
	  end
	end

	def utf8(string)
		string.force_encoding(Encoding::UTF_8)
	end

	def json_response(status,body,headers = {})
		status status 
		headers headers.merge! "Content-Type" => "application/json"
		body JSON.fast_generate(body)
	end

	def connect(datasource)
		begin
			ODBC::connect(datasource) do |connection|
				yield connection if block_given?
			end
		rescue ODBC::Error => e
			json_response 500, {errors: utf8(e.message)}
		end
	end

	def fetch(statement,offset=nil,limit=nil)
		rows = []
		if offset and limit
			((offset+1)..((offset+limit))).each do |n|
				row = statement.fetch_scroll(ODBC::SQL_FETCH_ABSOLUTE, n)
				rows << row if row
			end
		elsif offset and limit.nil?
			rows << statement.fetch_scroll(ODBC::SQL_FETCH_ABSOLUTE, offset+1)
			statement.fetch_all.each { |row| rows << row.to_a if row }
		else
			rows = statement.each.collect { |row| row.to_a }
		end
		rows
	end

	def count(connection,table)
		statement = connection.run("SELECT COUNT(*) FROM #{table}")
		statement.first.first
	end

	def columns(statement)
		statement.columns(true).collect do |c| 
			{
				name:c.name.downcase, 
				type:c.type,
				table: c.table.downcase,
				length: c.length,
				precision: c.precision,
				scale: c.scale,
				nullable: c.nullable
			}
		end
	end

	get "#{api_path}/ping" do
		connect(datasource) do |connection|
			begin
				json_response 200, { alive: connection.connected? }
		 	rescue ODBC::Error => e
				json_response 500, { alive: false, errors: utf8(e.message) }
			ensure
				connection.disconnect if connection
			end
		end
	end

	get "#{api_path}/types" do
		connect(datasource) do |connection|
			begin
				statement = connection.types
				types = statement.each_hash.collect do |t|
					{
						name: t['TYPENAME'],
						type: t['TYPE'],
						precision: t['PRECISION'],
						params: t['PARAMS'],
						nullable: t['NULLABLE'] == 0 ? false : true,
						casesensitive: t['CASESENSITIVE'] == 0 ? false : true
					}
				end
				json_response 200, { types: types }
			rescue ODBC::Error => e
				json_response 404, { errors: utf8(e.message) }
			ensure
				statement.close if statement
				connection.disconnect if connection
			end
		end
	end

	get "#{api_path}/tables" do
		connect(datasource) do |connection|
			begin
				statement = connection.tables
				tables = statement.each.collect { |t| t[2].downcase }
				json_response 200, { tables: tables }
			rescue ODBC::Error => e
				json_response 404, { errors: utf8(e.message) }
			ensure
				statement.close if statement
				connection.disconnect if connection
			end
		end
	end

	get "#{api_path}/tables/:table" do |table|
		connect(datasource) do |connection|
			begin
				count = count(connection,table)
				statement = connection.columns(table)
				columns = statement.each_hash.collect do |c|
					{
						name: c['COLUMNNAME'].downcase,
						type: c['TYPE'],
						table: c['TABLENAME'].downcase,
						length: c['LENGTH'],
						precision: c['PRECISION'],
						scale: c['SACALE'],
						nullable: c['NULLABLE'] == 0 ? false : true,
					  typename: c['TYPENAME'],
					  position: c['ORDINAL_POSITION']
					} 	
				end
				json_response 200, { name: table.downcase, records: count, columns: columns }
		  rescue ODBC::Error => e
				json_response 404, { errors: utf8(e.message) }
			ensure
				statement.close if statement
				connection.disconnect if connection
			end
		end
	end

	def validate_statement(statement)
		raise JSON::ParserError, "you need to define a valid SQL statement :/" unless statement
		is_select = /select\s.*/ =~statement.downcase.strip
		raise JSON::ParserError, "only SELECT SQL statements are supported for now :(" unless is_select
	end

	post "#{api_path}/statements" do
		connect(datasource) do |connection|
			begin 
				params = JSON.parse(request.body.read.to_s, symbolize_names: true)
				logger.info params
				validate_statement(params[:statement])
				connection.set_option(ODBC::SQL_CURSOR_TYPE, ODBC::SQL_CURSOR_DYNAMIC) if params[:offset]
				statement = connection.run(params[:statement])
				columns = columns(statement)
				rows = fetch(statement, params[:offset], params[:limit])
				json_response 200, { records: rows.length, columns: columns, rows: rows }
		  rescue JSON::ParserError => e
				json_response 400, { errors:e.message }
			rescue ODBC::Error => e
				json_response 500, { errors: utf8(e.message) }
			ensure
				statement.close if statement
				connection.disconnect if connection
			end
		end
	end

	options '/*' do
	  response.headers["Allow"] = "HEAD,GET,PUT,DELETE,OPTIONS"
	  response.headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Cache-Control, Accept"
	  halt HTTP_STATUS_OK
	end

	get '/' do
		redirect '/index.html'
	end
end

Atlas.run!

require 'rubygems' if RUBY_VERSION < "1.9"
require 'sinatra'
require 'sinatra/reloader' if development?
require 'rack/cors'
require 'odbc_utf8'
require 'json'

class Atlas < Sinatra::Base

	set :static, true
	set :public_folder, File.dirname(__FILE__) + '/public'

	datasource = 'atlas'
	api_path = '/api'

	use Rack::Cors do
	  allow do
	    origins '*'
	    resource "#{api_path}/*", :headers => :any, :methods => [:get, :post, :put, :delete]
	  end
	end

	def utf8(string)
		string.force_encoding(Encoding::UTF_8)
	end

	def json_response(status,body,headers = {})
		status status 
		headers headers.merge! "Content-Type" => "application/json"
		body JSON.fast_generate(body)
	end

	def connect(datasource)
		begin
			ODBC::connect(datasource) do |connection|
				yield connection if block_given?
			end
		rescue ODBC::Error => e
			json_response 500, {errors: utf8(e.message)}
		end
	end

	def fetch(statement,offset=nil,limit=nil)
		rows = []
		if offset and limit
			((offset+1)..((offset+limit))).each do |n|
				row = statement.fetch_scroll(ODBC::SQL_FETCH_ABSOLUTE, n)
				rows << row if row
			end
		elsif offset and limit.nil?
			rows << statement.fetch_scroll(ODBC::SQL_FETCH_ABSOLUTE, offset+1)
			statement.fetch_all.each { |row| rows << row.to_a if row }
		else
			rows = statement.each.collect { |row| row.to_a }
		end
		rows
	end

	def count(connection,table)
		statement = connection.run("SELECT COUNT(*) FROM #{table}")
		statement.first.first
	end

	def columns(statement)
		statement.columns(true).collect do |c| 
			{
				name:c.name.downcase, 
				type:c.type,
				table: c.table.downcase,
				length: c.length,
				precision: c.precision,
				scale: c.scale,
				nullable: c.nullable
			}
		end
	end

	get "#{api_path}/ping" do
		connect(datasource) do |connection|
			begin
				json_response 200, { alive: connection.connected? }
		 	rescue ODBC::Error => e
				json_response 500, { alive: false, errors: utf8(e.message) }
			ensure
				connection.disconnect if connection
			end
		end
	end

	get "#{api_path}/types" do
		connect(datasource) do |connection|
			begin
				statement = connection.types
				types = statement.each_hash.collect do |t|
					{
						name: t['TYPENAME'],
						type: t['TYPE'],
						precision: t['PRECISION'],
						params: t['PARAMS'],
						nullable: t['NULLABLE'] == 0 ? false : true,
						casesensitive: t['CASESENSITIVE'] == 0 ? false : true
					}
				end
				json_response 200, { types: types }
			rescue ODBC::Error => e
				json_response 404, { errors: utf8(e.message) }
			ensure
				statement.close if statement
				connection.disconnect if connection
			end
		end
	end

	get "#{api_path}/tables" do
		connect(datasource) do |connection|
			begin
				statement = connection.tables
				tables = statement.each.collect { |t| t[2].downcase }
				json_response 200, { tables: tables }
			rescue ODBC::Error => e
				json_response 404, { errors: utf8(e.message) }
			ensure
				statement.close if statement
				connection.disconnect if connection
			end
		end
	end

	get "#{api_path}/tables/:table" do |table|
		connect(datasource) do |connection|
			begin
				count = count(connection,table)
				statement = connection.columns(table)
				columns = statement.each_hash.collect do |c|
					{
						name: c['COLUMNNAME'].downcase,
						type: c['TYPE'],
						table: c['TABLENAME'].downcase,
						length: c['LENGTH'],
						precision: c['PRECISION'],
						scale: c['SACALE'],
						nullable: c['NULLABLE'] == 0 ? false : true,
					  typename: c['TYPENAME'],
					  position: c['ORDINAL_POSITION']
					} 	
				end
				json_response 200, { name: table.downcase, records: count, columns: columns }
		  rescue ODBC::Error => e
				json_response 404, { errors: utf8(e.message) }
			ensure
				statement.close if statement
				connection.disconnect if connection
			end
		end
	end

	def validate_statement(statement)
		raise JSON::ParserError, "you need to define a valid SQL statement :/" unless statement
		is_select = /select\s.*/ =~statement.downcase.strip
		raise JSON::ParserError, "only SELECT SQL statements are supported for now :(" unless is_select
	end

	post "#{api_path}/statements" do
		connect(datasource) do |connection|
			begin 
				params = JSON.parse(request.body.read.to_s, symbolize_names: true)
				logger.info params
				validate_statement(params[:statement])
				connection.set_option(ODBC::SQL_CURSOR_TYPE, ODBC::SQL_CURSOR_DYNAMIC) if params[:offset]
				statement = connection.run(params[:statement])
				columns = columns(statement)
				rows = fetch(statement, params[:offset], params[:limit])
				json_response 200, { records: rows.length, columns: columns, rows: rows }
		  rescue JSON::ParserError => e
				json_response 400, { errors:e.message }
			rescue ODBC::Error => e
				json_response 500, { errors: utf8(e.message) }
			ensure
				statement.close if statement
				connection.disconnect if connection
			end
		end
	end

	options '/*' do
	  response.headers["Allow"] = "HEAD,GET,PUT,DELETE,OPTIONS"
	  response.headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Cache-Control, Accept"
	  halt HTTP_STATUS_OK
	end

	get '/' do
		redirect '/index.html'
	end
end